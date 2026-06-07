package com.globalco.jobboard.controller;

import com.globalco.jobboard.dto.response.ApiResponse;
import com.globalco.jobboard.dto.response.NotificationResponse;
import com.globalco.jobboard.security.SecurityUtils;
import com.globalco.jobboard.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ApiResponse<List<NotificationResponse>> getNotifications() {
        return ApiResponse.ok(notificationService.getUserNotifications(securityUtils.getCurrentUser()));
    }

    @GetMapping("/unread-count")
    public ApiResponse<Map<String, Long>> unreadCount() {
        return ApiResponse.ok(Map.of("count", notificationService.getUnreadCount(securityUtils.getCurrentUser())));
    }

    @PatchMapping("/{id}/read")
    public ApiResponse<Void> markRead(@PathVariable Long id) {
        notificationService.markAsRead(id, securityUtils.getCurrentUser());
        return ApiResponse.ok(null);
    }

    @PatchMapping("/read-all")
    public ApiResponse<Void> markAllRead() {
        notificationService.markAllAsRead(securityUtils.getCurrentUser());
        return ApiResponse.ok(null);
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteNotification(@PathVariable Long id) {
        notificationService.deleteNotification(id, securityUtils.getCurrentUser());
        return ApiResponse.ok("Notification removed", null);
    }
}
