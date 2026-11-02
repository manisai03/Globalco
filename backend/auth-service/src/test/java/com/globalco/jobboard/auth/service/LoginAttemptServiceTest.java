package com.globalco.jobboard.auth.service;

import com.globalco.jobboard.common.exception.TooManyRequestsException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LoginAttemptServiceTest {

    private static final class MutableClock extends Clock {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        @Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
        void advance(Duration d) { now = now.plus(d); }
    }

    private final MutableClock clock = new MutableClock();
    private final LoginAttemptService service = new LoginAttemptService(clock);

    private void fail(String email, int times) {
        for (int i = 0; i < times; i++) service.recordFailure(email);
    }

    @Test
    void locksAfterMaxFailures() {
        fail("a@x.com", LoginAttemptService.MAX_FAILURES - 1);
        assertThatCode(() -> service.checkAllowed("a@x.com")).doesNotThrowAnyException();

        service.recordFailure("a@x.com");
        assertThatThrownBy(() -> service.checkAllowed("a@x.com"))
                .isInstanceOf(TooManyRequestsException.class)
                .satisfies(e -> org.assertj.core.api.Assertions
                        .assertThat(((TooManyRequestsException) e).getRetryAfterSeconds()).isPositive());
    }

    @Test
    void emailIsCaseAndWhitespaceInsensitive() {
        fail("A@X.com ", LoginAttemptService.MAX_FAILURES);
        assertThatThrownBy(() -> service.checkAllowed("a@x.com")).isInstanceOf(TooManyRequestsException.class);
    }

    @Test
    void lockExpires() {
        fail("a@x.com", LoginAttemptService.MAX_FAILURES);
        clock.advance(LoginAttemptService.LOCK_DURATION.plusSeconds(1));
        assertThatCode(() -> service.checkAllowed("a@x.com")).doesNotThrowAnyException();
    }

    @Test
    void failuresOutsideTheWindowDoNotAccumulate() {
        fail("a@x.com", LoginAttemptService.MAX_FAILURES - 1);
        clock.advance(LoginAttemptService.WINDOW.plusSeconds(1));
        service.recordFailure("a@x.com");
        assertThatCode(() -> service.checkAllowed("a@x.com")).doesNotThrowAnyException();
    }

    @Test
    void successResetsTheCounter() {
        fail("a@x.com", LoginAttemptService.MAX_FAILURES - 1);
        service.recordSuccess("a@x.com");
        service.recordFailure("a@x.com");
        assertThatCode(() -> service.checkAllowed("a@x.com")).doesNotThrowAnyException();
    }

    @Test
    void otherEmailsAreUnaffected() {
        fail("a@x.com", LoginAttemptService.MAX_FAILURES);
        assertThatCode(() -> service.checkAllowed("b@x.com")).doesNotThrowAnyException();
    }
}
