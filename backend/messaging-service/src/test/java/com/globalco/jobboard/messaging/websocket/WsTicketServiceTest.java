package com.globalco.jobboard.messaging.websocket;

import com.globalco.jobboard.common.security.AccountPrincipal;
import com.globalco.jobboard.common.security.AccountType;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class WsTicketServiceTest {

    private static final AccountPrincipal USER = new AccountPrincipal(7L, "u@example.com", AccountType.USER, "U");

    private final AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-11-02T10:00:00Z"));
    private final Clock clock = new Clock() {
        @Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
        @Override public Instant instant() { return now.get(); }
    };
    private final WsTicketService tickets = new WsTicketService(clock);

    @Test
    void ticketIsSingleUse() {
        Instant sessionEnd = now.get().plus(Duration.ofHours(1));
        String ticket = tickets.issue(USER, sessionEnd);

        assertThat(tickets.redeem(ticket)).hasValueSatisfying(r -> {
            assertThat(r.principal()).isEqualTo(USER);
            assertThat(r.sessionExpiresAt()).isEqualTo(sessionEnd);
        });
        assertThat(tickets.redeem(ticket)).isEmpty();
    }

    @Test
    void expiredTicketIsRejected() {
        String ticket = tickets.issue(USER, now.get().plus(Duration.ofHours(1)));
        now.set(now.get().plus(WsTicketService.TICKET_TTL));

        assertThat(tickets.redeem(ticket)).isEmpty();
    }

    @Test
    void ticketForAnExpiredSessionIsRejected() {
        String ticket = tickets.issue(USER, now.get().plusSeconds(5));
        now.set(now.get().plusSeconds(10));

        assertThat(tickets.redeem(ticket)).isEmpty();
    }

    @Test
    void unknownOrBlankTicketsAreRejected() {
        assertThat(tickets.redeem("nope")).isEmpty();
        assertThat(tickets.redeem("")).isEmpty();
        assertThat(tickets.redeem(null)).isEmpty();
    }
}
