package com.globalco.jobboard.auth.service;

import com.globalco.jobboard.common.exception.TooManyRequestsException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Slows down password guessing: after {@link #MAX_FAILURES} wrong passwords for one email within
 * {@link #WINDOW}, further attempts for that email are refused for {@link #LOCK_DURATION}.
 * State is in memory per auth-service instance; with several instances behind the load balancer an
 * attacker gets at most MAX_FAILURES attempts per instance per window.
 */
@Component
public class LoginAttemptService {

    static final int MAX_FAILURES = 5;
    static final Duration WINDOW = Duration.ofMinutes(15);
    static final Duration LOCK_DURATION = Duration.ofMinutes(15);
    private static final int MAX_TRACKED_EMAILS = 100_000;

    private final Map<String, Attempts> attempts = new ConcurrentHashMap<>();
    private final Clock clock;

    @Autowired
    public LoginAttemptService() {
        this(Clock.systemUTC());
    }

    LoginAttemptService(Clock clock) {
        this.clock = clock;
    }

    /** @throws TooManyRequestsException while the email is locked */
    public void checkAllowed(String email) {
        Attempts entry = attempts.get(key(email));
        if (entry == null || entry.lockedUntil == null) return;
        Instant now = clock.instant();
        if (now.isBefore(entry.lockedUntil)) {
            long retryAfter = Math.max(1, Duration.between(now, entry.lockedUntil).toSeconds());
            throw new TooManyRequestsException(
                    "Too many failed sign-in attempts. Try again in " + Math.max(1, (retryAfter + 59) / 60)
                            + " minute(s) or reset your password.", retryAfter);
        }
        attempts.remove(key(email), entry);
    }

    public void recordFailure(String email) {
        Instant now = clock.instant();
        if (attempts.size() >= MAX_TRACKED_EMAILS) evictExpired(now);
        attempts.compute(key(email), (k, entry) -> {
            if (entry == null || now.isAfter(entry.windowStart.plus(WINDOW))) {
                entry = new Attempts(now);
            }
            entry.failures++;
            if (entry.failures >= MAX_FAILURES) {
                entry.lockedUntil = now.plus(LOCK_DURATION);
            }
            return entry;
        });
    }

    public void recordSuccess(String email) {
        attempts.remove(key(email));
    }

    private void evictExpired(Instant now) {
        attempts.entrySet().removeIf(e -> {
            Attempts a = e.getValue();
            boolean lockOver = a.lockedUntil == null || now.isAfter(a.lockedUntil);
            return lockOver && now.isAfter(a.windowStart.plus(WINDOW));
        });
    }

    private static String key(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private static final class Attempts {
        final Instant windowStart;
        int failures;
        Instant lockedUntil;

        Attempts(Instant windowStart) {
            this.windowStart = windowStart;
        }
    }
}
