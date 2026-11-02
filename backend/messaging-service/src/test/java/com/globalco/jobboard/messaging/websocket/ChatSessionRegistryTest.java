package com.globalco.jobboard.messaging.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.globalco.jobboard.common.dto.response.MessageResponse;
import com.globalco.jobboard.common.security.AccountType;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ChatSessionRegistryTest {

    private static final Instant NOW = Instant.parse("2026-11-02T10:00:00Z");

    private final ChatSessionRegistry registry = new ChatSessionRegistry(
            new ObjectMapper().registerModule(new JavaTimeModule()), Clock.fixed(NOW, ZoneOffset.UTC));

    private static WebSocketSession openSession(String id) {
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn(id);
        when(session.isOpen()).thenReturn(true);
        return session;
    }

    private static MessageResponse messageTo(long receiverId) {
        return MessageResponse.builder()
                .id(1L)
                .senderAccountType(AccountType.ADMIN).senderId(99L)
                .receiverAccountType(AccountType.USER).receiverId(receiverId)
                .content("hi")
                .build();
    }

    @Test
    void oneFailingTabDoesNotStopDeliveryToTheOthers() throws Exception {
        WebSocketSession broken = openSession("a");
        WebSocketSession healthy = openSession("b");
        doThrow(new IOException("broken pipe")).when(broken).sendMessage(any());
        registry.register(AccountType.USER, 7L, broken, NOW.plusSeconds(3600));
        registry.register(AccountType.USER, 7L, healthy, NOW.plusSeconds(3600));

        registry.deliver(messageTo(7L));

        verify(healthy).sendMessage(any(WebSocketMessage.class));
    }

    @Test
    void expiredSessionsAreClosedSoTheClientReconnectsWithAFreshTicket() throws Exception {
        WebSocketSession expired = openSession("old");
        WebSocketSession current = openSession("new");
        registry.register(AccountType.USER, 7L, expired, NOW.minusSeconds(1));
        registry.register(AccountType.USER, 7L, current, NOW.plusSeconds(3600));

        registry.closeExpiredSessions();

        verify(expired).close(ChatSessionRegistry.SESSION_EXPIRED);
        verify(current, never()).close(any(CloseStatus.class));
        assertThat(registry.openSessionCount()).isEqualTo(1);
    }

    @Test
    void closeAllEndsEverySocketOfTheAccount() throws Exception {
        WebSocketSession tab1 = openSession("1");
        WebSocketSession tab2 = openSession("2");
        WebSocketSession other = openSession("3");
        registry.register(AccountType.USER, 7L, tab1, NOW.plusSeconds(3600));
        registry.register(AccountType.USER, 7L, tab2, NOW.plusSeconds(3600));
        registry.register(AccountType.USER, 8L, other, NOW.plusSeconds(3600));

        registry.closeAll(AccountType.USER, 7L);

        verify(tab1).close(CloseStatus.POLICY_VIOLATION);
        verify(tab2).close(CloseStatus.POLICY_VIOLATION);
        verify(other, never()).close(any(CloseStatus.class));
        assertThat(registry.openSessionCount()).isEqualTo(1);
    }
}
