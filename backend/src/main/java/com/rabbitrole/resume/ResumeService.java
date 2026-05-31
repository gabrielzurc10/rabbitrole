package com.rabbitrole.resume;

import com.rabbitrole.common.ApiException;
import com.rabbitrole.resume.dto.ResumeResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

/**
 * Orchestrates an upload: store the file, extract its text, persist the result.
 * Controllers stay thin and call into here; I/O lives in the storage/repo
 * collaborators so this logic is testable without AWS (see CLAUDE.md).
 */
@Service
public class ResumeService {

    /** How much extracted text to echo back in the response preview. */
    private static final int PREVIEW_CHARS = 280;

    private final S3Storage storage;
    private final ResumeTextExtractor extractor;
    private final ResumeRepository repository;

    public ResumeService(S3Storage storage,
                         ResumeTextExtractor extractor,
                         ResumeRepository repository) {
        this.storage = storage;
        this.extractor = extractor;
        this.repository = repository;
    }

    public ResumeResponse upload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("No resume file was provided.");
        }

        byte[] bytes = readBytes(file);
        String filename = file.getOriginalFilename();
        String contentType = file.getContentType();

        String text = extractor.extract(filename, contentType, bytes);
        if (text.isBlank()) {
            throw ApiException.badRequest("No text could be extracted from the resume.");
        }

        // Stored for parity with the S3 flow; the key isn't surfaced yet.
        storage.put(filename, bytes);

        Resume resume = repository.save(new Resume(
                UUID.randomUUID().toString(),
                filename,
                contentType,
                text));

        return toResponse(resume);
    }

    public ResumeResponse get(String id) {
        Resume resume = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("No resume found for id " + id));
        return toResponse(resume);
    }

    private byte[] readBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw ApiException.badRequest("Could not read the uploaded file.");
        }
    }

    private ResumeResponse toResponse(Resume resume) {
        String text = resume.extractedText();
        String preview = text.length() <= PREVIEW_CHARS
                ? text
                : text.substring(0, PREVIEW_CHARS) + "…";
        return new ResumeResponse(
                resume.id(),
                resume.filename(),
                resume.filetype(),
                text.length(),
                preview);
    }
}
