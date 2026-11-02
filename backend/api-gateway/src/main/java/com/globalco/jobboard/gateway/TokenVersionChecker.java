package com.globalco.jobboard.gateway;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Clock;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.BiFunction;

/**
 * Rejects tokens issued before the account's last password change (or for deleted accounts) by comparing
 * the token's version claim with auth-service. Answers are cached briefly so this isn't a call per request;
 * if auth-service can't be reached the token is accepted (signature and expiry were already verified).
 */
@Slf4j
@Component
public class TokenVersionChecker {

    static final Duration CACHE_TTL = Duration.ofSeconds(30);
    private static final int MAX_CACHE_ENTRIES = 50_000;

    private final BiFunction<String, Long, Mono<Integer>> lookup;
    private final Clock clock;
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();

    private record Cached(int version, long expiresAtMillis) {}

    @Autowired
    public TokenVersionChecker(@LoadBalanced WebClient.Builder webClientBuilder,
                               @Value("${app.internal.token}") String internalToken) {
        this(remoteLookup(webClientBuilder.build(), internalToken), Clock.systemUTC());
    }

    TokenVersionChecker(BiFunction<String, Long, Mono<Integer>> lookup, Clock clock) {
        this.lookup = lookup;
        this.clock = clock;
    }

    private static BiFunction<String, Long, Mono<Integer>> remoteLookup(WebClient client, String internalToken) {
        return (type, id) -> client.get()
                .uri("http://auth-service/internal/accounts/token-versions/{type}/{id}", type, id)
                .header("X-Internal-Token", internalToken)
                .retrieve()
                .bodyToMono(Integer.class)
                .timeout(Duration.ofSeconds(2));
    }

    public Mono<Boolean> isCurrent(String accountType, Long accountId, int tokenVersion) {
        String key = accountType + ":" + accountId;
        long now = clock.millis();
        Cached cached = cache.get(key);
        if (cached != null && cached.expiresAtMillis() > now) {
            return Mono.just(cached.version() >= 0 && tokenVersion >= cached.version());
        }
        return lookup.apply(accountType, accountId)
                .map(version -> {
                    if (cache.size() > MAX_CACHE_ENTRIES) cache.clear();
                    cache.put(key, new Cached(version, now + CACHE_TTL.toMillis()));
                    return version >= 0 && tokenVersion >= version;
                })
                .onErrorResume(e -> {
                    log.warn("Token version check unavailable for {}: {}", key, e.getMessage());
                    return Mono.just(true);
                });
    }

    @Configuration
    static class WebClientConfig {
        @Bean
        @LoadBalanced
        WebClient.Builder loadBalancedWebClientBuilder() {
            return WebClient.builder();
        }
    }
}
