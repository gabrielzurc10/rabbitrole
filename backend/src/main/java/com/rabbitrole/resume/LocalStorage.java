package com.rabbitrole.resume;

import com.rabbitrole.common.ApiException;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Local stand-in for {@link S3Storage}: keeps the file bytes in an in-memory map
 * so viewing/download work without S3 (they reset on restart — fine for demo).
 * Default for local + tests; replaced by {@link AwsS3Storage} on aws.
 */
@Component
@Profile("!aws")
public class LocalStorage implements S3Storage {

    private final Map<String, byte[]> store = new ConcurrentHashMap<>();

    @Override
    public void put(String key, byte[] bytes) {
        store.put(key, bytes);
    }

    @Override
    public byte[] get(String key) {
        byte[] bytes = store.get(key);
        if (bytes == null) {
            throw ApiException.notFound("No stored file for key " + key);
        }
        return bytes;
    }

    @Override
    public String presignedUrl(String key, String contentType, String filename, boolean inline) {
        return null; // no S3 to presign against locally — callers stream the bytes instead
    }

    @Override
    public void delete(String key) {
        store.remove(key);
    }
}
