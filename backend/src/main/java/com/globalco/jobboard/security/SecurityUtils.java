package com.globalco.jobboard.security;

import com.globalco.jobboard.exception.UnauthorizedException;
import com.globalco.jobboard.model.Admin;
import com.globalco.jobboard.model.AuthenticatedAccount;
import com.globalco.jobboard.model.User;
import com.globalco.jobboard.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SecurityUtils {

    private final AccountService accountService;

    public AuthenticatedAccount getCurrentAccount() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new UnauthorizedException("Not authenticated");
        }
        return accountService.findByEmail(auth.getName())
                .orElseThrow(() -> new UnauthorizedException("Account not found"));
    }

    public User getCurrentUser() {
        AuthenticatedAccount account = getCurrentAccount();
        if (account instanceof User user) {
            return user;
        }
        throw new UnauthorizedException("Candidate account required");
    }

    public Admin getCurrentAdmin() {
        AuthenticatedAccount account = getCurrentAccount();
        if (account instanceof Admin admin) {
            return admin;
        }
        throw new UnauthorizedException("Admin account required");
    }

    public User getCurrentUserOrNull() {
        try {
            AuthenticatedAccount account = getCurrentAccount();
            return account instanceof User user ? user : null;
        } catch (Exception e) {
            return null;
        }
    }

    public boolean isAdmin(AuthenticatedAccount account) {
        return account instanceof Admin;
    }
}
