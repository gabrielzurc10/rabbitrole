package com.rabbitrole.profiles;

import com.rabbitrole.common.CurrentUser;
import com.rabbitrole.profiles.dto.ProfileResponse;
import com.rabbitrole.profiles.dto.SaveProfileRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The signed-in user's onboarding profile.
 * GET /api/profiles/me 404s until onboarding is done (the frontend gate).
 */
@RestController
@RequestMapping("/api/profiles")
public class ProfileController {

    private final ProfileService service;
    private final CurrentUser currentUser;

    public ProfileController(ProfileService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping("/me")
    public ProfileResponse me() {
        return service.get(currentUser.id());
    }

    @PutMapping("/me")
    public ProfileResponse save(@Valid @RequestBody SaveProfileRequest request) {
        return service.save(request, currentUser.id());
    }
}
