package com.globalco.jobboard.common.feign;

import com.globalco.jobboard.common.exception.BadRequestException;
import com.globalco.jobboard.common.exception.DownstreamServiceException;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RemoteCallsTest {

    private final RemoteCalls remoteCalls = new RemoteCalls(50, 10, 60);

    @Test
    void returnsTheResultWhenTheCallSucceeds() {
        assertThat(remoteCalls.call("ai-service", () -> 42)).isEqualTo(42);
    }

    @Test
    void opensAfterRepeatedFailuresAndThenFailsFastWithoutCalling() {
        AtomicInteger calls = new AtomicInteger();
        for (int i = 0; i < 5; i++) {
            assertThatThrownBy(() -> remoteCalls.call("ai-service", () -> {
                calls.incrementAndGet();
                throw new DownstreamServiceException("HTTP 503");
            })).isInstanceOf(DownstreamServiceException.class);
        }
        assertThat(remoteCalls.state("ai-service")).isEqualTo(CircuitBreaker.State.OPEN);

        assertThatThrownBy(() -> remoteCalls.call("ai-service", () -> {
            calls.incrementAndGet();
            return 1;
        })).isInstanceOf(DownstreamServiceException.class).hasMessageContaining("circuit open");
        assertThat(calls).hasValue(5);
    }

    @Test
    void businessErrorsDoNotOpenTheCircuit() {
        for (int i = 0; i < 10; i++) {
            assertThatThrownBy(() -> remoteCalls.call("job-service", () -> {
                throw new BadRequestException("You have already applied for this job");
            })).isInstanceOf(BadRequestException.class);
        }
        assertThat(remoteCalls.state("job-service")).isEqualTo(CircuitBreaker.State.CLOSED);
    }

    @Test
    void eachServiceHasItsOwnBreaker() {
        for (int i = 0; i < 5; i++) {
            assertThatThrownBy(() -> remoteCalls.call("ai-service", () -> {
                throw new DownstreamServiceException("down");
            }));
        }
        assertThat(remoteCalls.call("auth-service", () -> "ok")).isEqualTo("ok");
    }
}
