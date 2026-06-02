package com.rabbitrole.account;

import com.rabbitrole.common.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** DELETE /api/account — erase the signed-in user's data + Cognito identity. */
@RestController
@RequestMapping("/api/account")
public class AccountController {

    private final AccountService service;
    private final CurrentUser currentUser;

    public AccountController(AccountService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete() {
        service.deleteAccount(currentUser.id());
    }
}
