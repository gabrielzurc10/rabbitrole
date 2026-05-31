package com.rabbitrole.resume;

import com.rabbitrole.common.ApiException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ResumeTextExtractorTest {

    private final ResumeTextExtractor extractor = new ResumeTextExtractor();

    @Test
    void rejectsUnsupportedFileType() {
        assertThatThrownBy(() ->
                extractor.extract("resume.txt", "text/plain", "hello".getBytes()))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Unsupported file type");
    }
}
