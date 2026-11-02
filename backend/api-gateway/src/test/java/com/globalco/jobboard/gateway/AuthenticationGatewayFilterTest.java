package com.globalco.jobboard.gateway;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.Date;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class AuthenticationGatewayFilterTest {

    private static final String SECRET = "test-secret-test-secret-test-secret-0123456789";
    private final AtomicReference<Integer> currentVersion = new AtomicReference<>(0);
    private final TokenVersionChecker versions =
            new TokenVersionChecker((type, id) -> Mono.just(currentVersion.get()), Clock.systemUTC());
    private final AuthenticationGatewayFilter filter = new AuthenticationGatewayFilter(SECRET, versions, "local");
    private final AtomicReference<ServerWebExchange> forwarded = new AtomicReference<>();
    private final GatewayFilterChain chain = exchange -> {
        forwarded.set(exchange);
        return Mono.empty();
    };

    private static String token(String role) {
        return Jwts.builder().subject("1").claim("role", role)
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();
    }

    private static String accountToken(long id, int version) {
        return Jwts.builder().subject("u@x.com").claim("role", "ROLE_USER")
                .claim("accountId", id).claim("accountType", "USER").claim("tv", version)
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();
    }

    private MockServerWebExchange run(MockServerHttpRequest request) {
        return run(filter, request);
    }

    private MockServerWebExchange run(AuthenticationGatewayFilter target, MockServerHttpRequest request) {
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        target.filter(exchange, chain).block();
        return exchange;
    }

    @Test
    void tokensIssuedBeforeAPasswordChangeAreRejected() {
        currentVersion.set(2);
        MockServerWebExchange old = run(MockServerHttpRequest.get("/api/users/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accountToken(7, 1)).build());
        assertThat(old.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(forwarded.get()).isNull();

        run(MockServerHttpRequest.get("/api/users/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accountToken(8, 2)).build());
        assertThat(forwarded.get()).isNotNull();
    }

    @Test
    void deletedAccountsTokensAreRejected() {
        currentVersion.set(-1);
        MockServerWebExchange ex = run(MockServerHttpRequest.get("/api/users/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accountToken(9, 0)).build());
        assertThat(ex.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void apiDocsAreHiddenOutsideLocal() {
        AuthenticationGatewayFilter production = new AuthenticationGatewayFilter(SECRET, versions, "production");
        MockServerWebExchange ex = run(production, MockServerHttpRequest.get("/v3/api-docs/auth-service").build());
        assertThat(ex.getResponse().getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(forwarded.get()).isNull();
    }

    @Test
    void internalPathsAreHidden() {
        MockServerWebExchange ex = run(MockServerHttpRequest.get("/internal/users/1").build());
        assertThat(ex.getResponse().getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(forwarded.get()).isNull();
    }

    @Test
    void protectedPathWithoutTokenIsRejected() {
        MockServerWebExchange ex = run(MockServerHttpRequest.get("/api/users/me").build());
        assertThat(ex.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void publicGetWithStaleTokenDropsTheToken() {
        run(MockServerHttpRequest.get("/api/jobs/5").header(HttpHeaders.AUTHORIZATION, "Bearer garbage").build());
        assertThat(forwarded.get()).isNotNull();
        assertThat(forwarded.get().getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION)).isNull();
    }

    @Test
    void writingJobsRequiresAuthentication() {
        MockServerWebExchange ex = run(MockServerHttpRequest.post("/api/jobs").build());
        assertThat(ex.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void adminAreaRequiresAdminRole() {
        MockServerWebExchange user = run(MockServerHttpRequest.get("/api/admin/applicants")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token("ROLE_USER")).build());
        assertThat(user.getResponse().getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        run(MockServerHttpRequest.get("/api/admin/applicants")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token("ROLE_ADMIN")).build());
        assertThat(forwarded.get()).isNotNull();
    }

    @Test
    void swaggerIsPublic() {
        run(MockServerHttpRequest.get("/v3/api-docs/auth-service").build());
        assertThat(forwarded.get()).isNotNull();
    }

    @Test
    void safeRequestIdIsKeptAndUnsafeOneIsReplaced() {
        MockServerWebExchange kept = run(MockServerHttpRequest.get("/api/public/stats")
                .header("X-Request-Id", "abc-123").build());
        assertThat(kept.getResponse().getHeaders().getFirst("X-Request-Id")).isEqualTo("abc-123");
        assertThat(forwarded.get().getRequest().getHeaders().getFirst("X-Request-Id")).isEqualTo("abc-123");

        MockServerWebExchange replaced = run(MockServerHttpRequest.get("/api/public/stats")
                .header("X-Request-Id", "bad id\r\ninjected").build());
        String id = replaced.getResponse().getHeaders().getFirst("X-Request-Id");
        assertThat(id).isNotBlank().doesNotContain(" ").hasSize(36);
    }
}
