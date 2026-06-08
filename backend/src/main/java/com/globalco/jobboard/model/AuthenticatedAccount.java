package com.globalco.jobboard.model;

public interface AuthenticatedAccount {

    Long getId();

    String getEmail();

    String getPassword();

    String getFullName();

    AccountType getAccountType();

    default String getRoleName() {
        return getAccountType() == AccountType.ADMIN ? "ROLE_ADMIN" : "ROLE_USER";
    }
}
