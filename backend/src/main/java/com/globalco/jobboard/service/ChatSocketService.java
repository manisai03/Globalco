package com.globalco.jobboard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.globalco.jobboard.dto.response.MessageResponse;
import com.globalco.jobboard.websocket.JwtHandshakeInterceptor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatSocketService {

    private final ObjectMapper objectMapper;
    private final Map<Long, Set<WebSocketSession>> sessionsByUser = new ConcurrentHashMap<>();

    public void register(Long userId, WebSocketSession session) {
        sessionsByUser.computeIfAbsent(userId, id -> new CopyOnWriteArraySet<>()).add(session);
    }

    public void unregister(WebSocketSession session) {
        Long userId = (Long) session.getAttributes().get(JwtHandshakeInterceptor.USER_ID_ATTR);
        if (userId == null) {
            return;
        }
        Set<WebSocketSession> sessions = sessionsByUser.get(userId);
        if (sessions != null) {
            sessions.remove(session);
            if (sessions.isEmpty()) {
                sessionsByUser.remove(userId);
            }
        }
    }

    public void deliver(MessageResponse message) {
        sendToUser(message.getSenderId(), message);
        sendToUser(message.getReceiverId(), message);
    }

    private void sendToUser(Long userId, MessageResponse message) {
        if (userId == null) {
            return;
        }
        Set<WebSocketSession> sessions = sessionsByUser.get(userId);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }
        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "type", "NEW_MESSAGE",
                    "data", message
            ));
            TextMessage textMessage = new TextMessage(payload);
            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    session.sendMessage(textMessage);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to push chat message to user {}: {}", userId, e.getMessage());
        }
    }
}
