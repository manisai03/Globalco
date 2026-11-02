package com.globalco.jobboard.messaging.websocket;

import com.globalco.jobboard.common.security.AccountPrincipal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Single-use tickets for the chat WebSocket handshake, so the JWT never travels in a URL (where proxies and access
 * logs record it). Tickets live in memory, which matches the single-instance limit of the socket registry.
 */
@Component
public class WsTicketService {

    static final Duration TICKET_TTL = Duration.ofSeconds(30);
    private static final int MAX_OUTSTANDING = 50_000;

    public record Redeemed(AccountPrincipal principal, Instant sessionExpiresAt) {}

    private record Ticket(AccountPrincipal principal, Instant sessionExpiresAt, Instant ticketExpiresAt) {}

    private final Map<String, Ticket> tickets = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();
    private final Clock clock;

    @Autowired
    public WsTicketService() {
        this(Clock.systemUTC());
    }

    WsTicketService(Clock clock) {
        this.clock = clock;
    }

    /** @param sessionExpiresAt when the caller's JWT expires; the socket is closed then. */
    public String issue(AccountPrincipal principal, Instant sessionExpiresAt) {
        Instant now = clock.instant();
        if (tickets.size() >= MAX_OUTSTANDING) {
            tickets.values().removeIf(t -> !t.ticketExpiresAt().isAfter(now));
        }
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String ticket = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tickets.put(ticket, new Ticket(principal, sessionExpiresAt, now.plus(TICKET_TTL)));
        return ticket;
    }

    public Optional<Redeemed> redeem(String ticket) {
        if (ticket == null || ticket.isBlank()) return Optional.empty();
        Ticket t = tickets.remove(ticket);
        Instant now = clock.instant();
        if (t == null || !t.ticketExpiresAt().isAfter(now) || !t.sessionExpiresAt().isAfter(now)) {
            return Optional.empty();
        }
        return Optional.of(new Redeemed(t.principal(), t.sessionExpiresAt()));
    }
}
