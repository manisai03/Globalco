package com.globalco.jobboard.gateway;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

/** Same rule as the services' SecretsGuard: outside local/test, a real JWT secret is mandatory. */
@Component
public class GatewaySecretsGuard {

    static final String DEV_JWT_SECRET = "globalco-job-board-super-secret-key-change-in-production-min-256-bits";
    static final int MIN_JWT_SECRET_BYTES = 32;

    public GatewaySecretsGuard(@Value("${app.env:local}") String environment, @Value("${app.jwt.secret}") String jwtSecret) {
        if (!isAcceptable(environment, jwtSecret)) {
            throw new IllegalStateException("Insecure configuration for APP_ENV=" + environment
                    + ": JWT_SECRET must be set to a random value of at least " + MIN_JWT_SECRET_BYTES + " bytes");
        }
    }

    static boolean isAcceptable(String environment, String jwtSecret) {
        if ("local".equalsIgnoreCase(environment) || "test".equalsIgnoreCase(environment)) return true;
        return jwtSecret != null && !DEV_JWT_SECRET.equals(jwtSecret)
                && jwtSecret.getBytes(StandardCharsets.UTF_8).length >= MIN_JWT_SECRET_BYTES;
    }
}
