package com.globalco.jobboard.service;

import com.globalco.jobboard.dto.response.NotificationResponse;
import com.globalco.jobboard.exception.ResourceNotFoundException;
import com.globalco.jobboard.mapper.EntityMapper;
import com.globalco.jobboard.model.AccountType;
import com.globalco.jobboard.model.Admin;
import com.globalco.jobboard.model.AuthenticatedAccount;
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
        create(AccountType.USER, user.getId(), title, message, type, referenceId);
    }

    public void create(Admin admin, String title, String message, String type, Long referenceId) {
        create(AccountType.ADMIN, admin.getId(), title, message, type, referenceId);
    }

    public void create(AccountType accountType, Long accountId, String title, String message, String type, Long referenceId) {
        Notification notification = Notification.builder()
                .accountType(accountType)
                .accountId(accountId)
                .title(title)
                .message(message)
                .type(type)
                .referenceId(referenceId)
                .build();
        notificationRepository.save(notification);
    }

    public List<NotificationResponse> getNotifications(AuthenticatedAccount account) {
        return notificationRepository
                .findByAccountTypeAndAccountIdOrderByCreatedAtDesc(account.getAccountType(), account.getId())
                .stream()
                .map(EntityMapper::toNotificationResponse)
                .toList();
    }

    public long getUnreadCount(AuthenticatedAccount account) {
        return notificationRepository.countByAccountTypeAndAccountIdAndReadFlagFalse(
                account.getAccountType(), account.getId());
    }

    @Transactional
    public void markAsRead(Long id, AuthenticatedAccount account) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        if (!notification.getAccountType().equals(account.getAccountType())
                || !notification.getAccountId().equals(account.getId())) {
            throw new ResourceNotFoundException("Notification not found");
        }
        notification.setReadFlag(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(AuthenticatedAccount account) {
        notificationRepository
                .findByAccountTypeAndAccountIdOrderByCreatedAtDesc(account.getAccountType(), account.getId())
                .forEach(n -> {
                    n.setReadFlag(true);
                    notificationRepository.save(n);
                });
    }

    @Transactional
    public void deleteNotification(Long id, AuthenticatedAccount account) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        if (!notification.getAccountType().equals(account.getAccountType())
                || !notification.getAccountId().equals(account.getId())) {
            throw new ResourceNotFoundException("Notification not found");
        }
        notificationRepository.delete(notification);
    }
}
