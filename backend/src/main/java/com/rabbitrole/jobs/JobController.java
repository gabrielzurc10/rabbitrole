package com.rabbitrole.jobs;

import com.rabbitrole.common.CurrentUser;
import com.rabbitrole.jobs.dto.Job;
import com.rabbitrole.jobs.dto.ReasonRequest;
import com.rabbitrole.jobs.dto.ReasonResponse;
import com.rabbitrole.profiles.Profile;
import com.rabbitrole.profiles.ProfileService;
import com.rabbitrole.resume.ResumeService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Live job postings. {@code GET /api/jobs/me} matches against the caller's saved
 * profile (roles + work mode + cities) and ranks by their resume — the Jobs tab.
 * The legacy {@code GET /api/jobs?role&resumeId} stays for the analysis flow.
 */
@RestController
@RequestMapping("/api/jobs")
public class JobController {

    private final JobService jobs;
    private final ResumeService resumes;
    private final ProfileService profiles;
    private final JobReasoningService reasoning;
    private final CurrentUser currentUser;

    public JobController(JobService jobs, ResumeService resumes, ProfileService profiles,
                         JobReasoningService reasoning, CurrentUser currentUser) {
        this.jobs = jobs;
        this.resumes = resumes;
        this.profiles = profiles;
        this.reasoning = reasoning;
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

    @GetMapping("/me")
    public ResponseEntity<List<Job>> forMe(@RequestParam(defaultValue = "0") int page) {
        String userId = currentUser.id();
        // 204 (not 404) when there's no profile yet, so the browser doesn't log a
        // console error for the expected "not onboarded" case — the frontend gates
        // on it and routes to onboarding.
        Profile profile = profiles.find(userId).orElse(null);
        if (profile == null) {
            return ResponseEntity.noContent().build();
        }
        // The resume is read under the caller's id, enforcing ownership.
        String resumeText = profile.resumeId() == null
                ? null
                : resumes.extractedText(profile.resumeId(), userId);
        // page is 0-based; an out-of-range page just yields an empty list ("no more").
        return ResponseEntity.ok(jobs.forProfile(profile, resumeText, Math.max(0, page)));
    }

    /**
     * On-demand "why this match?" reasoning for a single posting. The caller sends
     * the posting context (jobs aren't persisted); the resume is resolved from
     * their profile, so the explanation only ever uses a resume they own.
     */
    @PostMapping("/reasoning")
    public ReasonResponse reasoning(@Valid @RequestBody ReasonRequest request) {
        return new ReasonResponse(reasoning.reason(request, currentUser.id()));
    }
}
