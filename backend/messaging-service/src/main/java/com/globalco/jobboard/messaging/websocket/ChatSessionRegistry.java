package com.globalco.jobboard.messaging.websocket;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.globalco.jobboard.common.dto.response.MessageResponse;
import com.globalco.jobboard.common.security.AccountType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;

import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Open chat sockets on this instance. Sessions are in memory, so messaging-service runs as a single
 * instance (or behind sticky sessions); see docs/microservices/DECISIONS.md for the scale-out path.
 */
@Slf4j
@Component
public class ChatSessionRegistry {

    /** The client reconnects with a fresh ticket; if its token has expired, fetching the ticket fails and it logs out. */
    static final CloseStatus SESSION_EXPIRED = new CloseStatus(4001, "Session expired");
    private static final int SEND_TIME_LIMIT_MS = 5_000;
    private static final int BUFFER_SIZE_LIMIT = 512 * 1024;

    private record Entry(WebSocketSession session, Instant expiresAt) {}

    private final ObjectMapper objectMapper;
    private final Clock clock;
    /** account key -> session id -> session */
    private final Map<String, Map<String, Entry>> sessionsByAccount = new ConcurrentHashMap<>();

    @Autowired
    public ChatSessionRegistry(ObjectMapper objectMapper) {
        this(objectMapper, Clock.systemUTC());
    }

    ChatSessionRegistry(ObjectMapper objectMapper, Clock clock) {
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    public void register(AccountType type, Long id, WebSocketSession session, Instant expiresAt) {
        // The decorator serialises concurrent sends and drops a client that stops reading, instead of blocking.
        WebSocketSession safe = new ConcurrentWebSocketSessionDecorator(session, SEND_TIME_LIMIT_MS, BUFFER_SIZE_LIMIT);
        sessionsByAccount.computeIfAbsent(key(type, id), k -> new ConcurrentHashMap<>())
                .put(session.getId(), new Entry(safe, expiresAt));
    }

    public void unregister(AccountType type, Long id, WebSocketSession session) {
        sessionsByAccount.computeIfPresent(key(type, id), (k, sessions) -> {
            sessions.remove(session.getId());
            return sessions.isEmpty() ? null : sessions;
        });
    }

    public void deliver(MessageResponse message) {
        TextMessage payload;
        try {
            payload = new TextMessage(objectMapper.writeValueAsString(Map.of("type", "NEW_MESSAGE", "data", message)));
        } catch (JsonProcessingException e) {
            log.warn("Could not serialise chat message {}: {}", message.getId(), e.getMessage());
            return;
        }
        sendTo(message.getSenderAccountType(), message.getSenderId(), payload);
        sendTo(message.getReceiverAccountType(), message.getReceiverId(), payload);
    }

    /** Closes every socket of an account, e.g. when it is deleted. The client does not retry this close code. */
    public void closeAll(AccountType type, Long id) {
        Map<String, Entry> sessions = sessionsByAccount.remove(key(type, id));
        if (sessions != null) sessions.values().forEach(e -> close(e.session(), CloseStatus.POLICY_VIOLATION));
    }

    @Scheduled(fixedDelay = 30_000)
    public void closeExpiredSessions() {
        Instant now = clock.instant();
        sessionsByAccount.forEach((account, sessions) -> sessions.values().removeIf(e -> {
            if (e.expiresAt() != null && !e.expiresAt().isAfter(now)) {
                close(e.session(), SESSION_EXPIRED);
                return true;
            }
            return false;
        }));
        sessionsByAccount.values().removeIf(Map::isEmpty);
    }

    int openSessionCount() {
        return sessionsByAccount.values().stream().mapToInt(Map::size).sum();
    }

    private void sendTo(AccountType type, Long id, TextMessage payload) {
        if (type == null || id == null) return;
        Map<String, Entry> sessions = sessionsByAccount.get(key(type, id));
        if (sessions == null) return;
        for (Entry entry : sessions.values()) {
            WebSocketSession session = entry.session();
            if (!session.isOpen()) continue;
            try {
                session.sendMessage(payload);
            } catch (Exception e) {
                // One broken tab must not stop delivery to the account's other tabs.
                log.warn("Failed to push chat message to {}:{} session {}: {}", type, id, session.getId(), e.getMessage());
            }
        }
    }

    private static void close(WebSocketSession session, CloseStatus status) {
        try {
            session.close(status);
        } catch (IOException e) {
            log.debug("Closing chat session {} failed: {}", session.getId(), e.getMessage());
        }
    }

    private static String key(AccountType type, Long id) {
        return type.name() + ":" + id;
    }
}
