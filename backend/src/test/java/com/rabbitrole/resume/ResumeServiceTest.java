package com.rabbitrole.resume;

import com.rabbitrole.common.ApiException;
import com.rabbitrole.resume.dto.ResumeFile;
import com.rabbitrole.resume.dto.ResumeResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Service-level tests with a stub extractor — no real PDF/POI parsing needed.
 * Verifies the upload → extract → persist → respond flow and its guard rails.
 */
class ResumeServiceTest {

    private ResumeService service;

    @BeforeEach
    void setUp() {
        // Stub extractor: returns canned text instead of parsing bytes.
        ResumeTextExtractor extractor = new ResumeTextExtractor() {
            @Override
            public String extract(String filename, String contentType, byte[] bytes) {
                return "Senior Backend Engineer with 6 years building Java services.";
            }
        };
        service = new ResumeService(new LocalStorage(), extractor, new InMemoryResumeRepository());
    }

    @Test
    void uploadExtractsTextAndIsRetrievable() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "resume.pdf", "application/pdf", "%PDF-1.4 fake".getBytes());

        ResumeResponse uploaded = service.upload(file, "user-1");

        assertThat(uploaded.id()).isNotBlank();
        assertThat(uploaded.filename()).isEqualTo("resume.pdf");
        assertThat(uploaded.textLength()).isGreaterThan(0);
        assertThat(uploaded.textPreview()).contains("Backend Engineer");

        ResumeResponse fetched = service.get(uploaded.id(), "user-1");
        assertThat(fetched.id()).isEqualTo(uploaded.id());
    }

    @Test
    void downloadReturnsTheStoredBytes() {
        byte[] content = "%PDF-1.4 fake".getBytes();
        MockMultipartFile file = new MockMultipartFile(
                "file", "resume.pdf", "application/pdf", content);
        ResumeResponse uploaded = service.upload(file, "user-1");

        ResumeFile download = service.download(uploaded.id(), "user-1");
        assertThat(download.filename()).isEqualTo("resume.pdf");
        assertThat(download.filetype()).isEqualTo("application/pdf");
        assertThat(download.bytes()).isEqualTo(content);
    }

    @Test
    void emptyFileIsRejected() {
        MockMultipartFile empty = new MockMultipartFile(
                "file", "resume.pdf", "application/pdf", new byte[0]);

        assertThatThrownBy(() -> service.upload(empty, "user-1"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("No resume file");
    }

    @Test
    void unknownIdIsNotFound() {
        assertThatThrownBy(() -> service.get("does-not-exist", "user-1"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("No resume found");
    }

    @Test
    void anotherUsersResumeIsNotFound() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "resume.pdf", "application/pdf", "%PDF-1.4 fake".getBytes());
        ResumeResponse uploaded = service.upload(file, "owner");

        // A different user must not be able to read it — reported as not-found.
        assertThatThrownBy(() -> service.get(uploaded.id(), "intruder"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("No resume found");
    }
}
