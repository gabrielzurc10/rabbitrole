package com.rabbitrole.profiles;

import com.rabbitrole.analysis.AnalysisService;
import com.rabbitrole.profiles.dto.ProfileResponse;
import com.rabbitrole.profiles.dto.SaveProfileRequest;
import com.rabbitrole.resume.ResumeService;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Reads/writes the signed-in user's profile. Keyed by userId, so there's no
 * cross-user access to guard — the controller passes {@code currentUser.id()}.
 */
@Service
public class ProfileService {

    private final ProfileRepository repository;
    private final ResumeService resumes;
    private final AnalysisService analyses;

    public ProfileService(ProfileRepository repository,
                          ResumeService resumes,
                          AnalysisService analyses) {
        this.repository = repository;
        this.resumes = resumes;
        this.analyses = analyses;
    }

    /** The user's profile as a response DTO, or empty if they haven't onboarded. */
    public Optional<ProfileResponse> findResponse(String userId) {
        return repository.findByUserId(userId).map(this::toResponse);
    }

    /** Domain profile (for the jobs feature), or empty if not onboarded. */
    public Optional<Profile> find(String userId) {
        return repository.findByUserId(userId);
    }

    /** Create or update the profile (upsert). */
    public ProfileResponse save(SaveProfileRequest req, String userId) {
        // Remote postings are location-agnostic, so a remote-eligible search ignores
        // cities; only a non-remote search keeps whatever was entered.
        List<CityPreference> cities = !req.remote() && req.cities() != null
                ? List.copyOf(req.cities())
                : List.of();
        List<EmploymentType> types = req.employmentTypes() == null
                ? List.of()
                : List.copyOf(req.employmentTypes());
        Profile saved = repository.save(new Profile(
                userId,
                req.fullName(),
                List.copyOf(req.targetRoles()),
                req.remote(),
                types,
                cities,
                req.resumeId(),
                req.analysisId(),
                req.score(),
                Instant.now()));

        // A re-upload points the profile at a new resume + analysis; prune the
        // superseded ones (file + rows) now that the new state is durably saved.
        // Analyses go first — they FK-reference resumes. Skip when either id is
        // absent, so we never wipe everything for a resume-less save.
        if (req.resumeId() != null && req.analysisId() != null) {
            analyses.deleteOthers(userId, req.analysisId());
            resumes.deleteOthers(userId, req.resumeId());
        }
        return toResponse(saved);
    }

    private ProfileResponse toResponse(Profile p) {
        return new ProfileResponse(
                p.fullName(), p.targetRoles(), p.remote(), p.employmentTypes(), p.cities(),
                p.resumeId(), p.analysisId(), p.score(), p.updatedAt());
    }
}
