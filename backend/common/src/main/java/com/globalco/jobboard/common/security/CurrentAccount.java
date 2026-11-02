package com.globalco.jobboard.common.security;

import com.globalco.jobboard.common.exception.UnauthorizedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class CurrentAccount {

    public AccountPrincipal require() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AccountPrincipal principal)) {
            throw new UnauthorizedException("Not authenticated");
        }
        return principal;
    }

    public AccountPrincipal requireUser() {
        AccountPrincipal principal = require();
        if (!principal.isUser()) {
            throw new UnauthorizedException("Candidate account required");
        }
        return principal;
    }

    public AccountPrincipal requireAdmin() {
        AccountPrincipal principal = require();
        if (!principal.isAdmin()) {
            throw new UnauthorizedException("Admin account required");
        }
        return principal;
    }

    /** The signed-in candidate, or null for anonymous visitors and recruiters. */
    public AccountPrincipal userOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AccountPrincipal principal && principal.isUser()) {
            return principal;
        }
        return null;
    }
}
