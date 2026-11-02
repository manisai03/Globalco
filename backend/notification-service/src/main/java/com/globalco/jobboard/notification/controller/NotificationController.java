package com.globalco.jobboard.notification.controller;

import com.globalco.jobboard.common.dto.response.ApiResponse;
import com.globalco.jobboard.common.dto.response.NotificationResponse;
import com.globalco.jobboard.common.security.CurrentAccount;
import com.globalco.jobboard.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final CurrentAccount currentAccount;

    @GetMapping
    public ApiResponse<List<NotificationResponse>> getNotifications() {
        return ApiResponse.ok(notificationService.getNotifications(currentAccount.require()));
    }

    @GetMapping("/unread-count")
    public ApiResponse<Map<String, Long>> unreadCount() {
        return ApiResponse.ok(Map.of("count", notificationService.getUnreadCount(currentAccount.require())));
    }

    @PatchMapping("/{id}/read")
    public ApiResponse<Void> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id, currentAccount.require());
        return ApiResponse.ok("Marked as read", null);
    }

    @PatchMapping("/read-all")
    public ApiResponse<Void> markAllAsRead() {
        notificationService.markAllAsRead(currentAccount.require());
        return ApiResponse.ok("All marked as read", null);
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteNotification(@PathVariable Long id) {
        notificationService.deleteNotification(id, currentAccount.require());
        return ApiResponse.ok("Notification deleted", null);
    }
}
