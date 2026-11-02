package com.globalco.jobboard.gateway;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Edge security: rejects bad tokens early, enforces recruiter-only areas, hides internal APIs,
 * and stamps a correlation id. Services still verify the JWT themselves (defence in depth).
 */
@Component
public class AuthenticationGatewayFilter implements GlobalFilter, Ordered {

    static final String REQUEST_ID_HEADER = "X-Request-Id";

    private static final AntPathMatcher MATCHER = new AntPathMatcher();
    private static final Pattern SAFE_REQUEST_ID = Pattern.compile("[A-Za-z0-9._-]{1,64}");
    private static final List<String> PUBLIC_PATHS = List.of(
            "/api/auth/**", "/api/public/**", "/ws/**", "/actuator/health/**");
    private static final List<String> DOCS_PATHS = List.of(
            "/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**", "/webjars/**");
    private static final List<String> PUBLIC_GET_PATHS = List.of("/api/jobs/**", "/api/companies/**");
    private static final List<String> ADMIN_PATHS = List.of("/api/admin/**", "/api/ai/**");

    private final SecretKey signKey;
    private final TokenVersionChecker tokenVersions;
    private final boolean docsEnabled;

    public AuthenticationGatewayFilter(@Value("${app.jwt.secret}") String secret, TokenVersionChecker tokenVersions,
                                       @Value("${app.env:local}") String environment) {
        this.signKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.tokenVersions = tokenVersions;
        this.docsEnabled = "local".equalsIgnoreCase(environment) || "test".equalsIgnoreCase(environment);
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getPath().value();

        if (path.startsWith("/internal") || (!docsEnabled && matches(DOCS_PATHS, path))) {
            return reject(exchange, HttpStatus.NOT_FOUND, "Not found");
        }

        String requestId = request.getHeaders().getFirst(REQUEST_ID_HEADER);
        if (requestId == null || !SAFE_REQUEST_ID.matcher(requestId).matches()) {
            requestId = UUID.randomUUID().toString();
        }
        String finalRequestId = requestId;
        ServerHttpRequest.Builder mutated = request.mutate()
                .headers(h -> h.set(REQUEST_ID_HEADER, finalRequestId));
        exchange.getResponse().getHeaders().set(REQUEST_ID_HEADER, requestId);

        if (request.getMethod() == HttpMethod.OPTIONS) {
            return chain.filter(exchange.mutate().request(mutated.build()).build());
        }

        boolean isPublic = matches(PUBLIC_PATHS, path) || matches(DOCS_PATHS, path)
                || (request.getMethod() == HttpMethod.GET && matches(PUBLIC_GET_PATHS, path));
        String header = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        String token = header != null && header.startsWith("Bearer ") ? header.substring(7) : null;

        Claims claims = null;
        if (token != null) {
            try {
                claims = Jwts.parser().verifyWith(signKey).build().parseSignedClaims(token).getPayload();
            } catch (JwtException | IllegalArgumentException e) {
                if (!isPublic) {
                    return reject(exchange, HttpStatus.UNAUTHORIZED, "Session expired or invalid token");
                }
                // Public pages keep working for visitors holding a stale token.
                mutated.headers(h -> h.remove(HttpHeaders.AUTHORIZATION));
            }
        }

        if (!isPublic && claims == null) {
            return reject(exchange, HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        if (matches(ADMIN_PATHS, path) && (claims == null || !"ROLE_ADMIN".equals(claims.get("role", String.class)))) {
            return reject(exchange, HttpStatus.FORBIDDEN, "You do not have permission for this action");
        }

        Number accountId = claims != null ? claims.get("accountId", Number.class) : null;
        String accountType = claims != null ? claims.get("accountType", String.class) : null;
        if (accountId == null || accountType == null) {
            return chain.filter(exchange.mutate().request(mutated.build()).build());
        }
        Number versionClaim = claims.get("tv", Number.class);
        int tokenVersion = versionClaim != null ? versionClaim.intValue() : 0;
        return tokenVersions.isCurrent(accountType, accountId.longValue(), tokenVersion).flatMap(current -> {
            if (current) {
                return chain.filter(exchange.mutate().request(mutated.build()).build());
            }
            if (!isPublic) {
                return reject(exchange, HttpStatus.UNAUTHORIZED, "Session expired, please sign in again");
            }
            mutated.headers(h -> h.remove(HttpHeaders.AUTHORIZATION));
            return chain.filter(exchange.mutate().request(mutated.build()).build());
        });
    }

    private static boolean matches(List<String> patterns, String path) {
        return patterns.stream().anyMatch(p -> MATCHER.match(p, path));
    }

    private static Mono<Void> reject(ServerWebExchange exchange, HttpStatus status, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(status);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        byte[] body = ("{\"success\":false,\"message\":\"" + message + "\"}").getBytes(StandardCharsets.UTF_8);
        DataBuffer buffer = response.bufferFactory().wrap(body);
        return response.writeWith(Mono.just(buffer));
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }
}
