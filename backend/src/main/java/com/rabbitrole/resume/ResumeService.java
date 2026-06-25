package com.rabbitrole.resume;

import com.rabbitrole.common.ApiException;
import com.rabbitrole.resume.dto.ResumeFile;
import com.rabbitrole.resume.dto.ResumeFileUrls;
import com.rabbitrole.resume.dto.ResumeResponse;
import org.springframework.stereotype.Service;

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

    /**
     * Stores an uploaded resume from its raw bytes. The file arrives as a binary
     * request body (not multipart/form-data) because the Lambda serverless
     * container doesn't parse multipart parts — see {@link ResumeController}.
     */
    public ResumeResponse upload(byte[] bytes, String filename, String contentType, String userId) {
        if (bytes == null || bytes.length == 0) {
            throw ApiException.badRequest("No resume file was provided.");
        }

        String text = extractor.extract(filename, contentType, bytes);
        if (text.isBlank()) {
            throw ApiException.badRequest("No text could be extracted from the resume.");
        }

        // Generate the id first so the file is stored under a deterministic key
        // (resumes/{id}) we can reconstruct later to view/download it.
        String id = UUID.randomUUID().toString();
        storage.put(key(id), bytes);

        Resume resume = repository.save(new Resume(id, userId, filename, contentType, text));

        return toResponse(resume);
    }

    public ResumeResponse get(String id, String userId) {
        return toResponse(require(id, userId));
    }

    /** The original file bytes (owner-checked) for inline viewing / download. */
    public ResumeFile download(String id, String userId) {
        Resume resume = require(id, userId);
        return new ResumeFile(resume.filename(), resume.filetype(), storage.get(key(id)));
    }

    /**
     * Short-lived direct URLs (owner-checked) to view/download the file straight
     * from storage, bypassing the Lambda response path. Returns {@code null} URLs
     * in local dev, where the client streams the bytes via {@link #download}.
     */
    public ResumeFileUrls fileUrls(String id, String userId) {
        Resume resume = require(id, userId);
        String view = storage.presignedUrl(key(id), resume.filetype(), resume.filename(), true);
        String download = storage.presignedUrl(key(id), resume.filetype(), resume.filename(), false);
        return new ResumeFileUrls(view, download);
    }

    /**
     * After a re-upload, drop the user's superseded resumes (file + row) — every
     * one except the now-current {@code keepResumeId}. Callers must remove the
     * dependent analyses first (FK), see {@code ProfileService}.
     */
    public void deleteOthers(String userId, String keepResumeId) {
        for (String id : repository.idsByUserId(userId)) {
            if (!id.equals(keepResumeId)) {
                storage.delete(key(id));
                repository.deleteById(id);
            }
        }
    }

    /** Erase every resume (file + row) for a user — used on account deletion. */
    public void deleteAllForUser(String userId) {
        for (String id : repository.idsByUserId(userId)) {
            storage.delete(key(id));
        }
        repository.deleteByUserId(userId);
    }

    /** Storage key for a resume's original file. Single source of truth. */
    private static String key(String resumeId) {
        return "resumes/" + resumeId;
    }

    /** Raw extracted text for a resume — used by analysis + job matching. */
    public String extractedText(String id, String userId) {
        return require(id, userId).extractedText();
    }

    /**
     * Loads a resume the caller owns. A mismatched owner is reported as
     * not-found (not forbidden) so the API never leaks that an id exists.
     */
    private Resume require(String id, String userId) {
        Resume resume = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("No resume found for id " + id));
        if (!resume.userId().equals(userId)) {
            throw ApiException.notFound("No resume found for id " + id);
        }
        return resume;
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
