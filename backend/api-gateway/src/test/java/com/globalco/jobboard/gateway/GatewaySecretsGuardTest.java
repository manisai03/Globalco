package com.globalco.jobboard.gateway;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GatewaySecretsGuardTest {

    private static final String STRONG = "a-long-random-production-secret-of-sufficient-length";

    @Test
    void localAndTestAllowTheDevDefault() {
        assertThat(GatewaySecretsGuard.isAcceptable("local", GatewaySecretsGuard.DEV_JWT_SECRET)).isTrue();
        assertThat(GatewaySecretsGuard.isAcceptable("TEST", GatewaySecretsGuard.DEV_JWT_SECRET)).isTrue();
    }

    @Test
    void productionRejectsDefaultOrShortSecrets() {
        assertThat(GatewaySecretsGuard.isAcceptable("production", GatewaySecretsGuard.DEV_JWT_SECRET)).isFalse();
        assertThat(GatewaySecretsGuard.isAcceptable("production", "short")).isFalse();
        assertThat(GatewaySecretsGuard.isAcceptable("production", null)).isFalse();
        assertThat(GatewaySecretsGuard.isAcceptable("production", STRONG)).isTrue();
    }

    @Test
    void constructorFailsFastOnInsecureConfig() {
        assertThatThrownBy(() -> new GatewaySecretsGuard("production", GatewaySecretsGuard.DEV_JWT_SECRET))
                .isInstanceOf(IllegalStateException.class);
    }
}
