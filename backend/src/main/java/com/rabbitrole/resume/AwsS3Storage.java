package com.rabbitrole.resume;

import com.rabbitrole.common.ApiException;
import com.rabbitrole.config.AwsProperties;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/**
 * S3-backed {@link S3Storage}: persists/reads/deletes the original upload under
 * a caller-supplied key. Replaces {@link LocalStorage} under the aws profile.
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
    public void put(String key, byte[] bytes) {
        s3.putObject(
                PutObjectRequest.builder().bucket(bucket).key(key).build(),
                RequestBody.fromBytes(bytes));
    }

    @Override
    public byte[] get(String key) {
        try {
            return s3.getObjectAsBytes(
                    GetObjectRequest.builder().bucket(bucket).key(key).build()).asByteArray();
        } catch (NoSuchKeyException e) {
            // e.g. a resume uploaded before file storage tracked keys — no file to serve.
            throw ApiException.notFound("This resume's file isn't available. Re-upload it to view.");
        }
    }

    @Override
    public void delete(String key) {
        s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
    }
}
