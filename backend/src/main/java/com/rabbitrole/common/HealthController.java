package com.rabbitrole.common;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Liveness endpoint that returns 200 — used by the frontend's warm-up ping (fired
 * from the landing/sign-in pages) and as a cheap connectivity check. Public: it's
 * outside /api so security permits it.
 */
@RestController
public class HealthController {

    @GetMapping("/healthz")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
