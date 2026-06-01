package com.rabbitrole.resume;

import com.rabbitrole.common.CurrentUser;
import com.rabbitrole.resume.dto.ResumeResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Upload a resume (PDF/.docx) and read back the extracted text. */
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
}
