package com.rabbitrole.profiles;

import com.rabbitrole.common.ApiException;
import com.rabbitrole.profiles.dto.ProfileResponse;
import com.rabbitrole.profiles.dto.SaveProfileRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Profile save/get with the in-memory repo — verifies upsert, REMOTE clears
 * cities, per-user keying, and the not-found gate.
 */
class ProfileServiceTest {

    private ProfileService service;

    @BeforeEach
    void setUp() {
        service = new ProfileService(new InMemoryProfileRepository());
    }

    @Test
    void savesAndReadsBackProfile() {
        SaveProfileRequest req = new SaveProfileRequest(
                "Ada Lovelace",
                List.of("Backend Engineer", "Full Stack Engineer"),
                WorkMode.HYBRID,
                List.of(new CityPreference("Austin", "TX", 25)),
                "resume-1", "analysis-1", 82);

        ProfileResponse saved = service.save(req, "user-1");
        assertThat(saved.fullName()).isEqualTo("Ada Lovelace");
        assertThat(saved.targetRoles()).containsExactly("Backend Engineer", "Full Stack Engineer");
        assertThat(saved.cities()).hasSize(1);
        assertThat(saved.score()).isEqualTo(82);

        ProfileResponse fetched = service.get("user-1");
        assertThat(fetched.fullName()).isEqualTo("Ada Lovelace");
        assertThat(fetched.workMode()).isEqualTo(WorkMode.HYBRID);
    }

    @Test
    void saveUpsertsOnSameUser() {
        service.save(new SaveProfileRequest("First", List.of("Backend Engineer"),
                WorkMode.REMOTE, null, null, null, null), "user-1");
        service.save(new SaveProfileRequest("Second", List.of("Data Scientist"),
                WorkMode.REMOTE, null, null, null, 50), "user-1");

        ProfileResponse fetched = service.get("user-1");
        assertThat(fetched.fullName()).isEqualTo("Second");
        assertThat(fetched.targetRoles()).containsExactly("Data Scientist");
    }

    @Test
    void remoteModeStoresNoCities() {
        service.save(new SaveProfileRequest("Remote Rick", List.of("DevOps Engineer"),
                WorkMode.REMOTE, List.of(new CityPreference("Denver", "CO", 50)), null, null, null), "user-1");

        assertThat(service.get("user-1").cities()).isEmpty();
    }

    @Test
    void profilesAreScopedPerUser() {
        service.save(new SaveProfileRequest("Owner", List.of("Backend Engineer"),
                WorkMode.REMOTE, null, null, null, null), "owner");

        assertThatThrownBy(() -> service.get("someone-else"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("No profile found");
    }

    @Test
    void missingProfileIsNotFound() {
        assertThatThrownBy(() -> service.get("nobody"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("No profile found");
    }
}
