package com.rabbitrole.common;

import java.time.Instant;

/** Uniform error body returned by {@link ApiExceptionHandler}. */
public record ApiError(int status, String error, String message, Instant timestamp) {

    public static ApiError of(int status, String error, String message) {
        return new ApiError(status, error, message, Instant.now());
    }
}
