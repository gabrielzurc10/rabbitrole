package com.rabbitrole.resume;

/**
 * Stores and retrieves the original uploaded file by a caller-supplied key.
 * The key is derived from the resume id (see {@link ResumeService}) so a stored
 * file can be fetched back later for viewing/download. The local stub
 * ({@link LocalStorage}) keeps bytes in memory; {@link AwsS3Storage} uses S3.
 */
public interface S3Storage {

    /** Persists the file bytes under {@code key}, overwriting any existing object. */
    void put(String key, byte[] bytes);

    /** Reads back the bytes previously stored under {@code key}. */
    byte[] get(String key);

    /**
     * A short-lived URL the browser can hit directly to view/download the file,
     * with the given content type and disposition ({@code inline} vs attachment).
     * Lets the file bypass the Lambda response path, which mangles binary bytes
     * unless every content type is pre-registered as binary. Returns {@code null}
     * when the storage can't presign (local dev), so callers fall back to
     * streaming the bytes through {@link #get}.
     */
    String presignedUrl(String key, String contentType, String filename, boolean inline);

    /** Removes the object at {@code key} (no-op if it doesn't exist). */
    void delete(String key);
}
