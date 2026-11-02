package com.globalco.jobboard.common.security;

/**
 * Identity extracted from a verified JWT. Services trust these claims instead of
 * looking the account up in a database they do not own.
 */
public record AccountPrincipal(Long id, String email, AccountType accountType, String fullName) {

    public boolean isAdmin() {
        return accountType == AccountType.ADMIN;
    }

    public boolean isUser() {
        return accountType == AccountType.USER;
    }
}
