package com.globalco.jobboard.notification.service;

import com.globalco.jobboard.common.dto.response.NotificationResponse;
import com.globalco.jobboard.common.exception.ResourceNotFoundException;
import com.globalco.jobboard.common.security.AccountPrincipal;
import com.globalco.jobboard.common.security.AccountType;
import com.globalco.jobboard.notification.model.Notification;
import com.globalco.jobboard.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public void create(AccountType accountType, Long accountId, String title, String message, String type, Long referenceId) {
        notificationRepository.save(Notification.builder()
                .accountType(accountType)
                .accountId(accountId)
                .title(title)
                .message(message)
                .type(type)
                .referenceId(referenceId)
                .build());
    }

    @Transactional
    public int deleteAllForAccount(AccountType accountType, Long accountId) {
        return notificationRepository.deleteAllForAccount(accountType, accountId);
    }

    /** The most recent {@code 100}; older ones are still counted as unread until marked read. */
    public List<NotificationResponse> getNotifications(AccountPrincipal account) {
        return notificationRepository
                .findTop100ByAccountTypeAndAccountIdOrderByCreatedAtDesc(account.accountType(), account.id())
                .stream()
                .map(NotificationService::toResponse)
                .toList();
    }

    public long getUnreadCount(AccountPrincipal account) {
        return notificationRepository.countByAccountTypeAndAccountIdAndReadFlagFalse(account.accountType(), account.id());
    }

    @Transactional
    public void markAsRead(Long id, AccountPrincipal account) {
        Notification notification = getOwned(id, account);
        notification.setReadFlag(true);
    }

    @Transactional
    public void markAllAsRead(AccountPrincipal account) {
        notificationRepository.markAllRead(account.accountType(), account.id());
    }

    @Transactional
    public void deleteNotification(Long id, AccountPrincipal account) {
        notificationRepository.delete(getOwned(id, account));
    }

    private Notification getOwned(Long id, AccountPrincipal account) {
        return notificationRepository.findByIdAndAccountTypeAndAccountId(id, account.accountType(), account.id())
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
    }

    private static NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .title(n.getTitle())
                .message(n.getMessage())
                .type(n.getType())
                .read(n.getReadFlag())
                .referenceId(n.getReferenceId())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
