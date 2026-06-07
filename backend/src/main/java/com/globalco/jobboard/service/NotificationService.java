package com.globalco.jobboard.service;

import com.globalco.jobboard.dto.response.NotificationResponse;
import com.globalco.jobboard.exception.ResourceNotFoundException;
import com.globalco.jobboard.mapper.EntityMapper;
import com.globalco.jobboard.model.Notification;
import com.globalco.jobboard.model.User;
import com.globalco.jobboard.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public void create(User user, String title, String message, String type, Long referenceId) {
        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .type(type)
                .referenceId(referenceId)
                .build();
        notificationRepository.save(notification);
    }

    public List<NotificationResponse> getUserNotifications(User user) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(EntityMapper::toNotificationResponse)
                .toList();
    }

    public long getUnreadCount(User user) {
        return notificationRepository.countByUserIdAndReadFlagFalse(user.getId());
    }

    @Transactional
    public void markAsRead(Long id, User user) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        if (!notification.getUser().getId().equals(user.getId())) {
            throw new ResourceNotFoundException("Notification not found");
        }
        notification.setReadFlag(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(User user) {
        notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).forEach(n -> {
            n.setReadFlag(true);
            notificationRepository.save(n);
        });
    }

    @Transactional
    public void deleteNotification(Long id, User user) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        if (!notification.getUser().getId().equals(user.getId())) {
            throw new ResourceNotFoundException("Notification not found");
        }
        notificationRepository.delete(notification);
    }
}
