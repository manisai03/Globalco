package com.globalco.jobboard.common.feign;

import com.globalco.jobboard.common.exception.BadRequestException;
import com.globalco.jobboard.common.exception.DownstreamServiceException;
import com.globalco.jobboard.common.exception.ResourceNotFoundException;
import com.globalco.jobboard.common.exception.UnauthorizedException;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.function.Supplier;

/**
 * One circuit breaker per downstream service. After repeated failures (5xx, timeouts, connection errors)
 * calls fail fast with {@link DownstreamServiceException} instead of waiting on a sick service, so callers'
 * existing graceful-degradation paths kick in immediately. 4xx answers are business errors, not failures.
 */
@Component
public class RemoteCalls {

    private final CircuitBreakerRegistry registry;

    public RemoteCalls(
            @Value("${app.circuit-breaker.failure-rate:50}") float failureRate,
            @Value("${app.circuit-breaker.window:10}") int window,
            @Value("${app.circuit-breaker.open-seconds:20}") long openSeconds) {
        this.registry = CircuitBreakerRegistry.of(CircuitBreakerConfig.custom()
                .slidingWindowType(CircuitBreakerConfig.SlidingWindowType.COUNT_BASED)
                .slidingWindowSize(window)
                .minimumNumberOfCalls(Math.min(5, window))
                .failureRateThreshold(failureRate)
                .waitDurationInOpenState(Duration.ofSeconds(openSeconds))
                .permittedNumberOfCallsInHalfOpenState(2)
                .ignoreExceptions(BadRequestException.class, ResourceNotFoundException.class, UnauthorizedException.class)
                .build());
    }

    public <T> T call(String service, Supplier<T> call) {
        CircuitBreaker breaker = registry.circuitBreaker(service);
        try {
            return breaker.executeSupplier(call);
        } catch (CallNotPermittedException e) {
            throw new DownstreamServiceException(service + " is temporarily unavailable (circuit open)");
        }
    }

    public CircuitBreaker.State state(String service) {
        return registry.circuitBreaker(service).getState();
    }
}
