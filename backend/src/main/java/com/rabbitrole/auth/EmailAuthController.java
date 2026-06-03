package com.rabbitrole.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Passwordless email sign-in bootstrap. The frontend calls this BEFORE it asks
 * Cognito for an email OTP, so a brand-new address is provisioned (created +
 * confirmed) and the subsequent {@code InitiateAuth(EMAIL_OTP)} succeeds.
 *
 * <p>Unauthenticated by necessity (it runs pre-login), throttled per-email in
 * memory. Always responds 200: a {@code provider} in the body means the email
 * already belongs to that federated provider (e.g. Google) and the frontend
 * should steer the user there — returning 200 (not 409) keeps the browser console
 * clean for that expected case. The real spam defense is the COGNITO_DEFAULT
 * ~50/day cap; SES + WAF would harden it for production.
 */
@RestController
@RequestMapping("/api/auth/email")
public class EmailAuthController {

    private static final long RATE_LIMIT_MS = 30_000;

    private final EmailUserProvisioner provisioner;
    private final Map<String, Long> lastRequest = new ConcurrentHashMap<>();

    public EmailAuthController(EmailUserProvisioner provisioner) {
        this.provisioner = provisioner;
    }

    @PostMapping("/start")
    public EmailStartResponse start(@Valid @RequestBody EmailRequest request) {
        String email = request.email().trim().toLowerCase();
        long now = System.currentTimeMillis();
        Long previous = lastRequest.put(email, now);
        if (previous != null && now - previous < RATE_LIMIT_MS) {
            return new EmailStartResponse(null); // throttled — pretend OK
        }
        return new EmailStartResponse(provisioner.ensureUser(email));
    }

    public record EmailRequest(@Email @NotBlank String email) {
    }

    /** {@code provider} = a federated provider already using this email, else null. */
    public record EmailStartResponse(String provider) {
    }
}
