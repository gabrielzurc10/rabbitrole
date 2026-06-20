package com.rabbitrole.common;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Liveness endpoint that returns 200 — a cheap connectivity/health check (e.g. for
 * deploy verification). Public: it's outside /api so security permits it.
 */
@RestController
public class HealthController {

    @GetMapping("/healthz")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
