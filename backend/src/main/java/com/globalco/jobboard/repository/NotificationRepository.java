package com.globalco.jobboard.repository;

import com.globalco.jobboard.model.AccountType;
import com.globalco.jobboard.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByAccountTypeAndAccountIdOrderByCreatedAtDesc(AccountType accountType, Long accountId);
    long countByAccountTypeAndAccountIdAndReadFlagFalse(AccountType accountType, Long accountId);
}
