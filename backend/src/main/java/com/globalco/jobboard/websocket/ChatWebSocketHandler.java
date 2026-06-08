package com.globalco.jobboard.websocket;

import com.globalco.jobboard.model.AccountType;
import com.globalco.jobboard.service.ChatSocketService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
@RequiredArgsConstructor
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private final ChatSocketService chatSocketService;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        AccountType accountType = (AccountType) session.getAttributes().get(JwtHandshakeInterceptor.ACCOUNT_TYPE_ATTR);
        Long accountId = (Long) session.getAttributes().get(JwtHandshakeInterceptor.ACCOUNT_ID_ATTR);
        if (accountType != null && accountId != null) {
            chatSocketService.register(accountType, accountId, session);
        } else {
            try {
                session.close(CloseStatus.NOT_ACCEPTABLE);
            } catch (Exception ignored) {
                // ignore
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        chatSocketService.unregister(session);
    }
}
