package com.rabbitrole.resume;

import com.rabbitrole.common.CurrentUser;
import com.rabbitrole.resume.dto.ResumeFile;
import com.rabbitrole.resume.dto.ResumeResponse;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Upload a resume (PDF/.docx), read back the extracted text, or fetch the file. */
@RestController
@RequestMapping("/api/resumes")
public class ResumeController {

    private final ResumeService service;
    private final CurrentUser currentUser;

    public ResumeController(ResumeService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResumeResponse upload(@RequestParam("file") MultipartFile file) {
        return service.upload(file, currentUser.id());
    }

    @GetMapping("/{id}")
    public ResumeResponse get(@PathVariable String id) {
        return service.get(id, currentUser.id());
    }

    /** The original file bytes, served inline so the browser can preview the PDF. */
    @GetMapping("/{id}/file")
    public ResponseEntity<byte[]> file(@PathVariable String id) {
        ResumeFile file = service.download(id, currentUser.id());
        ContentDisposition disposition = ContentDisposition.inline()
                .filename(file.filename() == null ? "resume" : file.filename())
                .build();
        return ResponseEntity.ok()
                .contentType(mediaType(file.filetype()))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(file.bytes());
    }

    /** Stored content type, falling back to a generic binary type if absent/odd. */
    private static MediaType mediaType(String filetype) {
        if (filetype == null || filetype.isBlank()) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
        try {
            return MediaType.parseMediaType(filetype);
        } catch (InvalidMediaTypeException e) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }
}
