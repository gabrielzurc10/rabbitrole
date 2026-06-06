package com.rabbitrole.profiles;

import com.rabbitrole.analysis.AnalysisService;
import com.rabbitrole.analysis.InMemoryAnalysisRepository;
import com.rabbitrole.profiles.dto.ProfileResponse;
import com.rabbitrole.profiles.dto.SaveProfileRequest;
import com.rabbitrole.resume.InMemoryResumeRepository;
import com.rabbitrole.resume.LocalStorage;
import com.rabbitrole.resume.ResumeService;
import com.rabbitrole.resume.ResumeTextExtractor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Profile save/get with the in-memory repo — verifies upsert, REMOTE clears
 * cities, per-user keying, and the empty-when-not-onboarded gate.
 */
class ProfileServiceTest {

    private ProfileService service;

    @BeforeEach
    void setUp() {
        // The save-time prune only touches the resume/analysis repositories, so
        // the AI collaborators (jobs/openai) are unused here and left null.
        ResumeTextExtractor extractor = new ResumeTextExtractor() {
            @Override
            public String extract(String filename, String contentType, byte[] bytes) {
                return "";
            }
        };
        ResumeService resumes = new ResumeService(
                new LocalStorage(), extractor, new InMemoryResumeRepository());
        AnalysisService analyses = new AnalysisService(
                resumes, null, null, new InMemoryAnalysisRepository());
        service = new ProfileService(new InMemoryProfileRepository(), resumes, analyses);
    }

    @Test
    void savesAndReadsBackProfile() {
        SaveProfileRequest req = new SaveProfileRequest(
                "Ada Lovelace",
                List.of("Backend Engineer", "Full Stack Engineer"),
                false, // local search
                List.of(EmploymentType.FULL_TIME, EmploymentType.CONTRACT),
                List.of(new CityPreference("Austin", "TX")),
                "resume-1", "analysis-1", 82);

        ProfileResponse saved = service.save(req, "user-1");
        assertThat(saved.fullName()).isEqualTo("Ada Lovelace");
        assertThat(saved.targetRoles()).containsExactly("Backend Engineer", "Full Stack Engineer");
        assertThat(saved.cities()).hasSize(1);
        assertThat(saved.score()).isEqualTo(82);

        ProfileResponse fetched = service.findResponse("user-1").orElseThrow();
        assertThat(fetched.fullName()).isEqualTo("Ada Lovelace");
        assertThat(fetched.remote()).isFalse();
        assertThat(fetched.employmentTypes())
                .containsExactly(EmploymentType.FULL_TIME, EmploymentType.CONTRACT);
    }

    @Test
    void saveUpsertsOnSameUser() {
        service.save(new SaveProfileRequest("First", List.of("Backend Engineer"),
                true, List.of(), null, null, null, null), "user-1");
        service.save(new SaveProfileRequest("Second", List.of("Data Scientist"),
                true, List.of(), null, null, null, 50), "user-1");

        ProfileResponse fetched = service.findResponse("user-1").orElseThrow();
        assertThat(fetched.fullName()).isEqualTo("Second");
        assertThat(fetched.targetRoles()).containsExactly("Data Scientist");
    }

    @Test
    void remoteEligibleIgnoresCities() {
        // Remote postings are location-agnostic, so a remote-eligible save drops cities
        // even if some were submitted.
        service.save(new SaveProfileRequest("Remote Rick", List.of("DevOps Engineer"),
                true, List.of(),
                List.of(new CityPreference("Denver", "CO")), null, null, null), "user-1");

        assertThat(service.findResponse("user-1").orElseThrow().cities()).isEmpty();
    }

    @Test
    void profilesAreScopedPerUser() {
        service.save(new SaveProfileRequest("Owner", List.of("Backend Engineer"),
                true, List.of(), null, null, null, null), "owner");

        assertThat(service.findResponse("someone-else")).isEmpty();
    }

    @Test
    void missingProfileIsEmpty() {
        assertThat(service.findResponse("nobody")).isEmpty();
    }
}
