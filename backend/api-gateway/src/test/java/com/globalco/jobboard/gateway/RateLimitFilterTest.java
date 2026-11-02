package com.globalco.jobboard.gateway;

import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitFilterTest {

    private static final class MutableClock extends Clock {
        private Instant now = Instant.parse("2026-01-01T00:00:00Z");
        void advance(Duration d) { now = now.plus(d); }
        @Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }

    private final MutableClock clock = new MutableClock();
    private final RateLimitFilter filter = new RateLimitFilter(false, clock);
    private final AtomicInteger passed = new AtomicInteger();
    private final GatewayFilterChain chain = exchange -> {
        passed.incrementAndGet();
        return Mono.empty();
    };

    private MockServerWebExchange post(String path, String ip) {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest.post(path)
                .remoteAddress(new InetSocketAddress(ip, 5000)).build());
        filter.filter(exchange, chain).block();
        return exchange;
    }

    @Test
    void forgotPasswordIsLimitedPerIpAndWindow() {
        for (int i = 0; i < 5; i++) post("/api/auth/forgot-password", "10.0.0.1");
        MockServerWebExchange blocked = post("/api/auth/forgot-password", "10.0.0.1");

        assertThat(passed.get()).isEqualTo(5);
        assertThat(blocked.getResponse().getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(Integer.parseInt(blocked.getResponse().getHeaders().getFirst("Retry-After"))).isPositive();

        post("/api/auth/forgot-password", "10.0.0.2");
        assertThat(passed.get()).isEqualTo(6);

        clock.advance(Duration.ofMinutes(16));
        post("/api/auth/forgot-password", "10.0.0.1");
        assertThat(passed.get()).isEqualTo(7);
    }

    @Test
    void unlistedEndpointsAreNotLimited() {
        for (int i = 0; i < 200; i++) post("/api/jobs", "10.0.0.3");
        assertThat(passed.get()).isEqualTo(200);
    }

    @Test
    void forwardedForIsOnlyTrustedWhenEnabled() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/")
                .header("X-Forwarded-For", "203.0.113.9, 10.0.0.1")
                .remoteAddress(new InetSocketAddress("10.0.0.1", 5000)).build();
        assertThat(filter.clientIp(request)).isEqualTo("10.0.0.1");
        assertThat(new RateLimitFilter(true, clock).clientIp(request)).isEqualTo("203.0.113.9");
    }
}
