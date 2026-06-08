package com.globalco.jobboard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.globalco.jobboard.dto.response.MessageResponse;
import com.globalco.jobboard.model.AccountType;
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
    private final Map<String, Set<WebSocketSession>> sessionsByAccount = new ConcurrentHashMap<>();

    public void register(AccountType accountType, Long accountId, WebSocketSession session) {
        String key = JwtHandshakeInterceptor.sessionKey(accountType, accountId);
        sessionsByAccount.computeIfAbsent(key, id -> new CopyOnWriteArraySet<>()).add(session);
    }

    public void unregister(WebSocketSession session) {
        AccountType accountType = (AccountType) session.getAttributes().get(JwtHandshakeInterceptor.ACCOUNT_TYPE_ATTR);
        Long accountId = (Long) session.getAttributes().get(JwtHandshakeInterceptor.ACCOUNT_ID_ATTR);
        if (accountType == null || accountId == null) {
            return;
        }
        String key = JwtHandshakeInterceptor.sessionKey(accountType, accountId);
        Set<WebSocketSession> sessions = sessionsByAccount.get(key);
        if (sessions != null) {
            sessions.remove(session);
            if (sessions.isEmpty()) {
                sessionsByAccount.remove(key);
            }
        }
    }

    public void deliver(MessageResponse message) {
        sendToAccount(message.getSenderAccountType(), message.getSenderId(), message);
        sendToAccount(message.getReceiverAccountType(), message.getReceiverId(), message);
    }

    private void sendToAccount(AccountType accountType, Long accountId, MessageResponse message) {
        if (accountType == null || accountId == null) {
            return;
        }
        String key = JwtHandshakeInterceptor.sessionKey(accountType, accountId);
        Set<WebSocketSession> sessions = sessionsByAccount.get(key);
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
            log.warn("Failed to push chat message to {}:{}: {}", accountType, accountId, e.getMessage());
        }
    }
}
