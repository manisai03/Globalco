package com.globalco.jobboard.common.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Refuses to start outside local development when the JWT secret or internal token is missing,
 * too short, or still the publicly known development default (anyone could forge tokens with it).
 */
@Component
public class SecretsGuard {

    public static final String DEV_JWT_SECRET = "globalco-job-board-super-secret-key-change-in-production-min-256-bits";
    public static final String DEV_INTERNAL_TOKEN = "local-dev-internal-token-change-me";
    static final int MIN_JWT_SECRET_BYTES = 32;
    static final int MIN_INTERNAL_TOKEN_LENGTH = 24;

    public SecretsGuard(
            @Value("${app.env:local}") String environment,
            @Value("${app.jwt.secret}") String jwtSecret,
            @Value("${app.internal.token}") String internalToken) {
        List<String> problems = check(environment, jwtSecret, internalToken);
        if (!problems.isEmpty()) {
            throw new IllegalStateException("Insecure configuration for APP_ENV=" + environment + ": "
                    + String.join("; ", problems));
        }
    }

    static List<String> check(String environment, String jwtSecret, String internalToken) {
        List<String> problems = new ArrayList<>();
        if ("local".equalsIgnoreCase(environment) || "test".equalsIgnoreCase(environment)) {
            return problems;
        }
        if (jwtSecret == null || DEV_JWT_SECRET.equals(jwtSecret)
                || jwtSecret.getBytes(StandardCharsets.UTF_8).length < MIN_JWT_SECRET_BYTES) {
            problems.add("JWT_SECRET must be set to a random value of at least " + MIN_JWT_SECRET_BYTES + " bytes");
        }
        if (internalToken == null || DEV_INTERNAL_TOKEN.equals(internalToken)
                || internalToken.length() < MIN_INTERNAL_TOKEN_LENGTH) {
            problems.add("INTERNAL_API_TOKEN must be set to a random value of at least "
                    + MIN_INTERNAL_TOKEN_LENGTH + " characters");
        }
        return problems;
    }
}
