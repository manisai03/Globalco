package com.globalco.jobboard.gateway;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Fixed-window limits per client IP on abuse-prone endpoints (account creation, password reset, login,
 * messages, applications). Counters live in this gateway instance's memory, which is enough for the single
 * gateway this project runs; several gateway replicas would need a shared store such as Redis.
 */
@Component
public class RateLimitFilter implements GlobalFilter, Ordered {

    record Rule(String name, HttpMethod method, String pathPrefix, int limit, Duration window) {}

    static final List<Rule> RULES = List.of(
            new Rule("register", HttpMethod.POST, "/api/auth/register", 20, Duration.ofHours(1)),
            new Rule("forgot-password", HttpMethod.POST, "/api/auth/forgot-password", 5, Duration.ofMinutes(15)),
            new Rule("reset-password", HttpMethod.POST, "/api/auth/reset-password", 10, Duration.ofMinutes(15)),
            new Rule("login", HttpMethod.POST, "/api/auth/login", 30, Duration.ofMinutes(1)),
            new Rule("chat-ticket", HttpMethod.POST, "/api/messages/ws-ticket", 30, Duration.ofMinutes(1)),
            new Rule("messages", HttpMethod.POST, "/api/messages", 60, Duration.ofMinutes(1)),
            new Rule("applications", HttpMethod.POST, "/api/applications", 30, Duration.ofMinutes(1)));

    private static final int MAX_TRACKED_KEYS = 100_000;

    private record Window(long startMillis, AtomicInteger count) {}

    private final Map<String, Window> windows = new ConcurrentHashMap<>();
    private final boolean trustForwardedFor;
    private final Clock clock;

    @Autowired
    public RateLimitFilter(@Value("${app.rate-limit.trust-forwarded-for:false}") boolean trustForwardedFor) {
        this(trustForwardedFor, Clock.systemUTC());
    }

    RateLimitFilter(boolean trustForwardedFor, Clock clock) {
        this.trustForwardedFor = trustForwardedFor;
        this.clock = clock;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getPath().value();
        Rule rule = RULES.stream()
                .filter(r -> r.method() == request.getMethod() && path.startsWith(r.pathPrefix()))
                .findFirst()
                .orElse(null);
        if (rule == null) {
            return chain.filter(exchange);
        }

        long now = clock.millis();
        long windowMillis = rule.window().toMillis();
        if (windows.size() > MAX_TRACKED_KEYS) {
            windows.entrySet().removeIf(e -> now - e.getValue().startMillis() > Duration.ofHours(1).toMillis());
        }
        String key = rule.name() + ":" + clientIp(request);
        Window window = windows.compute(key, (k, current) ->
                current == null || now - current.startMillis() >= windowMillis
                        ? new Window(now, new AtomicInteger())
                        : current);
        if (window.count().incrementAndGet() <= rule.limit()) {
            return chain.filter(exchange);
        }
        long retryAfterSeconds = Math.max(1, (window.startMillis() + windowMillis - now + 999) / 1000);
        return tooManyRequests(exchange, retryAfterSeconds);
    }

    String clientIp(ServerHttpRequest request) {
        if (trustForwardedFor) {
            String forwarded = request.getHeaders().getFirst("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
        }
        InetSocketAddress remote = request.getRemoteAddress();
        return remote != null && remote.getAddress() != null ? remote.getAddress().getHostAddress() : "unknown";
    }

    private static Mono<Void> tooManyRequests(ServerWebExchange exchange, long retryAfterSeconds) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
        response.getHeaders().set(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfterSeconds));
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        byte[] body = "{\"success\":false,\"message\":\"Too many requests. Please wait a moment and try again.\"}"
                .getBytes(StandardCharsets.UTF_8);
        return response.writeWith(Mono.just(response.bufferFactory().wrap(body)));
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 5;
    }
}
