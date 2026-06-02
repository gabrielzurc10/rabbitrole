package com.rabbitrole.profiles;

/**
 * Where the user wants to work. Drives job matching: HYBRID/IN_PERSON use the
 * profile's cities + proximity, REMOTE searches remotely (see jobs feature).
 */
public enum WorkMode {
    IN_PERSON,
    HYBRID,
    REMOTE
}
