package com.globalco.jobboard.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Component
public class JwtService {

    public static final String CLAIM_ROLE = "role";
    public static final String CLAIM_ACCOUNT_ID = "accountId";
    public static final String CLAIM_ACCOUNT_TYPE = "accountType";
    public static final String CLAIM_NAME = "name";
    public static final String CLAIM_TOKEN_VERSION = "tv";

    private final SecretKey signKey;
    private final long expirationMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms:86400000}") long expirationMs) {
        this.signKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateToken(AccountPrincipal principal) {
        return generateToken(principal, 0);
    }

    /** {@code tokenVersion} lets the gateway reject tokens issued before a password change. */
    public String generateToken(AccountPrincipal principal, int tokenVersion) {
        return Jwts.builder()
                .subject(principal.email())
                .claim(CLAIM_ROLE, principal.accountType().roleName())
                .claim(CLAIM_ACCOUNT_ID, principal.id())
                .claim(CLAIM_ACCOUNT_TYPE, principal.accountType().name())
                .claim(CLAIM_NAME, principal.fullName())
                .claim(CLAIM_TOKEN_VERSION, tokenVersion)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(signKey)
                .compact();
    }

    /** @throws JwtException if the token is malformed, tampered with, expired, or missing identity claims. */
    public AccountPrincipal parse(String token) {
        Claims claims = claims(token);
        Number accountId = claims.get(CLAIM_ACCOUNT_ID, Number.class);
        String accountType = claims.get(CLAIM_ACCOUNT_TYPE, String.class);
        if (accountId == null || accountType == null) {
            throw new JwtException("Token is missing account claims");
        }
        return new AccountPrincipal(
                accountId.longValue(),
                claims.getSubject(),
                AccountType.valueOf(accountType),
                claims.get(CLAIM_NAME, String.class));
    }

    /** @throws JwtException if the token is malformed, tampered with or expired. */
    public Instant expiresAt(String token) {
        return claims(token).getExpiration().toInstant();
    }

    private Claims claims(String token) {
        return Jwts.parser()
                .verifyWith(signKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
