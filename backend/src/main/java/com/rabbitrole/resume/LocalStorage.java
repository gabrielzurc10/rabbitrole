package com.rabbitrole.resume;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Local stand-in for {@link S3Storage}: it doesn't actually persist bytes
 * (only the extracted text is needed locally), it just mints a plausible key so
 * the service flow matches what {@link AwsS3Storage} does on the aws profile.
 * Default for local + tests; replaced by {@link AwsS3Storage} on aws.
 */
@Component
@Profile("!aws")
public class LocalStorage implements S3Storage {

    @Override
    public String put(String filename, byte[] bytes) {
        return "resumes/" + UUID.randomUUID() + "/" + filename;
    }
}
