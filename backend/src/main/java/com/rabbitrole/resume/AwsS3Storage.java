package com.rabbitrole.resume;

import com.rabbitrole.config.AwsProperties;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.util.UUID;

/**
 * S3-backed {@link S3Storage}: persists the original upload under a unique key
 * and returns it. Replaces {@link LocalStorage} under the aws profile.
 */
@Component
@Profile("aws")
public class AwsS3Storage implements S3Storage {

    private final S3Client s3;
    private final String bucket;

    public AwsS3Storage(S3Client s3, AwsProperties props) {
        this.s3 = s3;
        this.bucket = props.getResumesBucket();
    }

    @Override
    public String put(String filename, byte[] bytes) {
        String key = "resumes/" + UUID.randomUUID() + "/" + filename;
        s3.putObject(
                PutObjectRequest.builder().bucket(bucket).key(key).build(),
                RequestBody.fromBytes(bytes));
        return key;
    }
}
