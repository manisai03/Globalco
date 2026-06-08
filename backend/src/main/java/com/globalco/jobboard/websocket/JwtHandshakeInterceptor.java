package com.globalco.jobboard.websocket;

import com.globalco.jobboard.model.AccountType;
import com.globalco.jobboard.service.AccountService;
import com.globalco.jobboard.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    public static final String ACCOUNT_TYPE_ATTR = "accountType";
    public static final String ACCOUNT_ID_ATTR = "accountId";

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final AccountService accountService;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) {

        String token = UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams().getFirst("token");
        if (token == null || token.isBlank()) {
            return false;
        }

        try {
            String username = jwtService.extractUsername(token);
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            if (!jwtService.isTokenValid(token, userDetails)) {
                return false;
            }
            var account = accountService.findByEmail(username).orElse(null);
            if (account == null) {
                return false;
            }
            attributes.put(ACCOUNT_TYPE_ATTR, account.getAccountType());
            attributes.put(ACCOUNT_ID_ATTR, account.getId());
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception) {
        // no-op
    }

    public static String sessionKey(AccountType type, Long id) {
        return type.name() + ":" + id;
    }
}
