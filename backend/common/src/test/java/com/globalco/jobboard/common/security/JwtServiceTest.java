package com.globalco.jobboard.common.security;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SECRET = "test-secret-that-is-long-enough-for-hs256-signing";
    private final JwtService jwtService = new JwtService(SECRET, 60_000);

    @Test
    void tokenRoundTripsTheIdentity() {
        AccountPrincipal principal = new AccountPrincipal(42L, "rita@example.com", AccountType.ADMIN, "Rita");

        AccountPrincipal parsed = jwtService.parse(jwtService.generateToken(principal));

        assertThat(parsed).isEqualTo(principal);
    }

    @Test
    void rejectsTokenSignedWithAnotherKey() {
        JwtService other = new JwtService("another-secret-that-is-long-enough-for-hs256", 60_000);
        String forged = other.generateToken(new AccountPrincipal(1L, "x@example.com", AccountType.ADMIN, "X"));

        assertThatThrownBy(() -> jwtService.parse(forged)).isInstanceOf(JwtException.class);
    }

    @Test
    void rejectsTamperedPayload() {
        String token = jwtService.generateToken(new AccountPrincipal(1L, "a@example.com", AccountType.USER, "A"));
        String[] parts = token.split("\\.");
        String tampered = parts[0] + "." + parts[1].substring(0, parts[1].length() - 2) + "xx." + parts[2];

        assertThatThrownBy(() -> jwtService.parse(tampered)).isInstanceOf(JwtException.class);
    }

    @Test
    void rejectsExpiredToken() {
        JwtService expiring = new JwtService(SECRET, -1_000);
        String token = expiring.generateToken(new AccountPrincipal(1L, "a@example.com", AccountType.USER, "A"));

        assertThatThrownBy(() -> jwtService.parse(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void rejectsValidlySignedTokenWithoutAccountClaims() {
        String token = Jwts.builder()
                .subject("someone@example.com")
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();

        assertThatThrownBy(() -> jwtService.parse(token))
                .isInstanceOf(JwtException.class)
                .hasMessageContaining("account claims");
    }
}
