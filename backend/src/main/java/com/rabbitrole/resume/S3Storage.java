package com.rabbitrole.resume;

/**
 * Stores the original uploaded file and returns a storage key.
 * Phase 2 keeps the bytes only long enough to extract text, so the local
 * stub ({@link LocalStorage}) just synthesizes a key. The real S3-backed
 * implementation (presigned upload + fetch) arrives in Phase 5.
 */
public interface S3Storage {

    /** Persists the file bytes and returns the storage key to reference it by. */
    String put(String filename, byte[] bytes);
}
