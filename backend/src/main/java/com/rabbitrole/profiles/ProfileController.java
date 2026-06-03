package com.rabbitrole.profiles;

import com.rabbitrole.common.CurrentUser;
import com.rabbitrole.profiles.dto.ProfileResponse;
import com.rabbitrole.profiles.dto.SaveProfileRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The signed-in user's onboarding profile.
 * GET /api/profiles/me returns 200 with the profile, or 204 No Content until
 * onboarding is done — a 204 (rather than a 404) keeps the browser console clean
 * for the expected "new account, no profile yet" case, which the frontend gates on.
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
    public ResponseEntity<ProfileResponse> me() {
        return service.findResponse(currentUser.id())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping("/me")
    public ProfileResponse save(@Valid @RequestBody SaveProfileRequest request) {
        return service.save(request, currentUser.id());
    }
}
