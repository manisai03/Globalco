package com.globalco.jobboard.common.dto.request;

/** Shared password length rule; bcrypt ignores everything after 72 bytes, so longer passwords are refused. */
public final class PasswordRules {

    private PasswordRules() {}

    public static final int MIN = 8;
    public static final int MAX = 72;
    public static final String MESSAGE = "Password must be 8-72 characters";
}
