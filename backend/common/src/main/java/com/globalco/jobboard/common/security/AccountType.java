package com.globalco.jobboard.common.security;

public enum AccountType {
    USER,
    ADMIN;

    public String roleName() {
        return this == ADMIN ? "ROLE_ADMIN" : "ROLE_USER";
    }
}
