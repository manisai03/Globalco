package com.globalco.jobboard.messaging.controller;

import com.globalco.jobboard.common.dto.request.MessageRequest;
import com.globalco.jobboard.common.dto.response.ApiResponse;
import com.globalco.jobboard.common.dto.response.ContactResponse;
import com.globalco.jobboard.common.dto.response.MessageResponse;
import com.globalco.jobboard.common.security.AccountPrincipal;
import com.globalco.jobboard.common.security.CurrentAccount;
import com.globalco.jobboard.common.security.JwtService;
import com.globalco.jobboard.messaging.service.MessageService;
import com.globalco.jobboard.messaging.websocket.WsTicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;
    private final CurrentAccount currentAccount;
    private final JwtService jwtService;
    private final WsTicketService ticketService;

    @PostMapping
    public ApiResponse<MessageResponse> sendMessage(@Valid @RequestBody MessageRequest request) {
        return ApiResponse.ok(messageService.sendMessage(request, currentAccount.require()));
    }

    @GetMapping("/conversation/{partnerId}")
    public ApiResponse<List<MessageResponse>> getConversation(@PathVariable Long partnerId) {
        return ApiResponse.ok(messageService.getConversation(partnerId, currentAccount.require()));
    }

    @GetMapping({"/contacts", "/partners"})
    public ApiResponse<List<ContactResponse>> getContacts() {
        return ApiResponse.ok(messageService.getContacts(currentAccount.require()));
    }

    @GetMapping("/unread-count")
    public ApiResponse<Map<String, Long>> unreadCount() {
        return ApiResponse.ok(Map.of("count", messageService.getUnreadCount(currentAccount.require())));
    }

    /** Single-use ticket (30 s) for opening /ws/chat?ticket=..., so the JWT stays out of URLs. */
    @PostMapping("/ws-ticket")
    public ApiResponse<Map<String, String>> wsTicket(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        AccountPrincipal principal = currentAccount.require();
        String token = authorization.startsWith("Bearer ") ? authorization.substring(7) : authorization;
        Instant sessionExpiresAt = jwtService.expiresAt(token);
        return ApiResponse.ok(Map.of("ticket", ticketService.issue(principal, sessionExpiresAt)));
    }
}
