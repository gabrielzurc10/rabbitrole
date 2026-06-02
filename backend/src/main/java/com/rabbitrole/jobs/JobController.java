package com.rabbitrole.jobs;

import com.rabbitrole.common.ApiException;
import com.rabbitrole.common.CurrentUser;
import com.rabbitrole.jobs.dto.Job;
import com.rabbitrole.profiles.Profile;
import com.rabbitrole.profiles.ProfileService;
import com.rabbitrole.resume.ResumeService;
import org.springframework.web.bind.annotation.GetMapping;
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
    private final CurrentUser currentUser;

    public JobController(JobService jobs, ResumeService resumes,
                         ProfileService profiles, CurrentUser currentUser) {
        this.jobs = jobs;
        this.resumes = resumes;
        this.profiles = profiles;
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
    public List<Job> forMe() {
        String userId = currentUser.id();
        Profile profile = profiles.find(userId)
                .orElseThrow(() -> ApiException.notFound("No profile found. Complete onboarding first."));
        // The resume is read under the caller's id, enforcing ownership.
        String resumeText = profile.resumeId() == null
                ? null
                : resumes.extractedText(profile.resumeId(), userId);
        return jobs.forProfile(profile, resumeText);
    }
}
