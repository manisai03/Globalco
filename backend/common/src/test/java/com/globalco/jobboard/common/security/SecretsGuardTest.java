package com.globalco.jobboard.common.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SecretsGuardTest {

    private static final String STRONG_SECRET = "f3b1c9e07a2d4c58b6e1f0a9d7c3b2e5f4a6c8d0";
    private static final String STRONG_TOKEN = "9c2e7f4a1b8d3e6c0f5a2b7d";

    @Test
    void localDevelopmentAcceptsTheDevDefaults() {
        assertThat(SecretsGuard.check("local", SecretsGuard.DEV_JWT_SECRET, SecretsGuard.DEV_INTERNAL_TOKEN)).isEmpty();
        assertThat(SecretsGuard.check("test", SecretsGuard.DEV_JWT_SECRET, SecretsGuard.DEV_INTERNAL_TOKEN)).isEmpty();
    }

    @Test
    void productionRejectsTheDevDefaults() {
        assertThat(SecretsGuard.check("production", SecretsGuard.DEV_JWT_SECRET, SecretsGuard.DEV_INTERNAL_TOKEN))
                .hasSize(2);
    }

    @Test
    void productionRejectsShortSecrets() {
        assertThat(SecretsGuard.check("production", "too-short", "short"))
                .anyMatch(p -> p.startsWith("JWT_SECRET"))
                .anyMatch(p -> p.startsWith("INTERNAL_API_TOKEN"));
    }

    @Test
    void productionAcceptsStrongSecrets() {
        assertThat(SecretsGuard.check("production", STRONG_SECRET, STRONG_TOKEN)).isEmpty();
    }

    @Test
    void constructorFailsStartupWhenInsecure() {
        assertThatThrownBy(() -> new SecretsGuard("staging", SecretsGuard.DEV_JWT_SECRET, STRONG_TOKEN))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");
    }
}
