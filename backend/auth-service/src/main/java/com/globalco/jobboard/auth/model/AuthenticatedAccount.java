package com.globalco.jobboard.auth.model;

import com.globalco.jobboard.common.security.AccountPrincipal;
import com.globalco.jobboard.common.security.AccountType;

public interface AuthenticatedAccount {

    Long getId();

    String getEmail();

    String getPassword();

    String getFullName();

    AccountType getAccountType();

    /** Bumped on password change/reset; tokens carrying an older version are rejected at the gateway. */
    int getTokenVersion();

    void setTokenVersion(int tokenVersion);

    default void revokeTokens() {
        setTokenVersion(getTokenVersion() + 1);
    }

    default String getRoleName() {
        return getAccountType().roleName();
    }

    default AccountPrincipal toPrincipal() {
        return new AccountPrincipal(getId(), getEmail(), getAccountType(), getFullName());
    }
}
