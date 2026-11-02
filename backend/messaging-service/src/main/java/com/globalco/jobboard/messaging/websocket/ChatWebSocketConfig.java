package com.globalco.jobboard.messaging.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * /ws/chat: browsers cannot set headers on a WebSocket handshake, so the client first gets a single-use ticket from
 * POST /api/messages/ws-ticket (authenticated with its JWT) and connects with ?ticket=. The JWT never appears in a URL.
 */
@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class ChatWebSocketConfig implements WebSocketConfigurer {

    private static final String SESSION_ATTR = "chatSession";

    private final WsTicketService ticketService;
    private final ChatSessionRegistry registry;

    @Value("${app.cors.allowed-origins:}")
    private String allowedOrigins;

    @Value("${app.env:local}")
    private String env;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry handlers) {
        List<String> patterns = new ArrayList<>();
        if ("local".equalsIgnoreCase(env) || "test".equalsIgnoreCase(env)) {
            patterns.addAll(List.of("http://localhost:*", "http://127.0.0.1:*"));
        }
        Arrays.stream(allowedOrigins.split(",")).map(String::trim).filter(s -> !s.isEmpty()).forEach(patterns::add);
        handlers.addHandler(new ChatHandler(), "/ws/chat")
                .addInterceptors(new TicketHandshakeInterceptor())
                .setAllowedOriginPatterns(patterns.stream().distinct().toArray(String[]::new));
    }

    private class TicketHandshakeInterceptor implements HandshakeInterceptor {
        @Override
        public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                       WebSocketHandler wsHandler, Map<String, Object> attributes) {
            String ticket = UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams().getFirst("ticket");
            return ticketService.redeem(ticket)
                    .map(redeemed -> {
                        attributes.put(SESSION_ATTR, redeemed);
                        return true;
                    })
                    .orElse(false);
        }

        @Override
        public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Exception exception) {
        }
    }

    private class ChatHandler extends TextWebSocketHandler {
        @Override
        public void afterConnectionEstablished(WebSocketSession session) throws Exception {
            if (session.getAttributes().get(SESSION_ATTR) instanceof WsTicketService.Redeemed r) {
                registry.register(r.principal().accountType(), r.principal().id(), session, r.sessionExpiresAt());
            } else {
                session.close(CloseStatus.NOT_ACCEPTABLE);
            }
        }

        @Override
        public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
            if (session.getAttributes().get(SESSION_ATTR) instanceof WsTicketService.Redeemed r) {
                registry.unregister(r.principal().accountType(), r.principal().id(), session);
            }
        }
    }
}
