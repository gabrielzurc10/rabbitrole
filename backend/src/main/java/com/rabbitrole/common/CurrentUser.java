package com.rabbitrole.common;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * Resolves the authenticated caller's id for per-user data scoping. On dev/prod
 * this is the Cognito JWT {@code sub}; running locally without a token it falls
 * back to a fixed id so a single developer can exercise the full flow offline.
 * Controllers read this and hand it down to the services (see CLAUDE.md — thin
 * controllers, logic in services).
 */
@Component
public class CurrentUser {

    /** Stable id used when no bearer token is present (local dev only). */
    static final String LOCAL_USER_ID = "local-dev-user";

    public String id() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            return jwt.getSubject();
        }
        return LOCAL_USER_ID;
    }
}
