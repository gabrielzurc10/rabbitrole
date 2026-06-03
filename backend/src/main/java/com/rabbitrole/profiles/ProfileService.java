package com.rabbitrole.profiles;

import com.rabbitrole.profiles.dto.ProfileResponse;
import com.rabbitrole.profiles.dto.SaveProfileRequest;
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

    public ProfileService(ProfileRepository repository) {
        this.repository = repository;
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
        List<CityPreference> cities = req.workMode() == WorkMode.REMOTE
                ? List.of()
                : List.copyOf(req.cities());
        Profile saved = repository.save(new Profile(
                userId,
                req.fullName(),
                List.copyOf(req.targetRoles()),
                req.workMode(),
                cities,
                req.resumeId(),
                req.analysisId(),
                req.score(),
                Instant.now()));
        return toResponse(saved);
    }

    private ProfileResponse toResponse(Profile p) {
        return new ProfileResponse(
                p.fullName(), p.targetRoles(), p.workMode(), p.cities(),
                p.resumeId(), p.analysisId(), p.score(), p.updatedAt());
    }
}
