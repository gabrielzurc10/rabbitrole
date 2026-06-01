package com.rabbitrole.jobs;

import com.rabbitrole.common.CurrentUser;
import com.rabbitrole.jobs.dto.Job;
import com.rabbitrole.resume.ResumeService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * GET /api/jobs?role=...&resumeId=... — live postings for a role. When a
 * resumeId is supplied, results are scored and ranked against that resume.
 */
@RestController
@RequestMapping("/api/jobs")
public class JobController {

    private final JobService jobs;
    private final ResumeService resumes;
    private final CurrentUser currentUser;

    public JobController(JobService jobs, ResumeService resumes, CurrentUser currentUser) {
        this.jobs = jobs;
        this.resumes = resumes;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<Job> list(@RequestParam String role,
                          @RequestParam(required = false) String resumeId) {
        if (resumeId == null || resumeId.isBlank()) {
            return jobs.forRole(role);
        }
        // Scoping to the caller ensures matching only reads a resume they own.
        String resumeText = resumes.extractedText(resumeId, currentUser.id());
        return jobs.matches(role, resumeText);
    }
}
