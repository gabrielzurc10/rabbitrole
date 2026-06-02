package com.rabbitrole.common;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Liveness endpoint that returns 200. The Lambda Web Adapter polls this to
 * decide the app is ready (it only treats 2xx/3xx as ready) — pointing it at
 * Spring's /error, which returns 500, would leave the Lambda perpetually "not
 * ready". Public: it's outside /api so security permits it.
 */
@RestController
public class HealthController {

    @GetMapping("/healthz")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
