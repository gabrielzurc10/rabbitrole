package com.rabbitrole.resume;

import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Local stand-in for {@link S3Storage}: it doesn't actually persist bytes
 * (Phase 2 only needs the extracted text), it just mints a plausible key so
 * the service flow matches what the S3 implementation will do later.
 */
@Component
public class LocalStorage implements S3Storage {

    @Override
    public String put(String filename, byte[] bytes) {
        return "resumes/" + UUID.randomUUID() + "/" + filename;
    }
}
