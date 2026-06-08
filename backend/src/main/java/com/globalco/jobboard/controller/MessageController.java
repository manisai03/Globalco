package com.globalco.jobboard.controller;

import com.globalco.jobboard.dto.request.MessageRequest;
import com.globalco.jobboard.dto.response.ApiResponse;
import com.globalco.jobboard.dto.response.ContactResponse;
import com.globalco.jobboard.dto.response.MessageResponse;
import com.globalco.jobboard.security.SecurityUtils;
import com.globalco.jobboard.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;
    private final SecurityUtils securityUtils;

    @PostMapping
    public ApiResponse<MessageResponse> sendMessage(@Valid @RequestBody MessageRequest request) {
        return ApiResponse.ok(messageService.sendMessage(request, securityUtils.getCurrentAccount()));
    }

    @GetMapping("/conversation/{partnerId}")
    public ApiResponse<List<MessageResponse>> getConversation(@PathVariable Long partnerId) {
        return ApiResponse.ok(messageService.getConversation(partnerId, securityUtils.getCurrentAccount()));
    }

    @GetMapping("/contacts")
    public ApiResponse<List<ContactResponse>> getContacts() {
        return ApiResponse.ok(messageService.getConversationPartners(securityUtils.getCurrentAccount()));
    }

    @GetMapping("/partners")
    public ApiResponse<List<ContactResponse>> getPartners() {
        return ApiResponse.ok(messageService.getConversationPartners(securityUtils.getCurrentAccount()));
    }

    @GetMapping("/unread-count")
    public ApiResponse<Map<String, Long>> unreadCount() {
        return ApiResponse.ok(Map.of("count", messageService.getUnreadCount(securityUtils.getCurrentAccount())));
    }
}
