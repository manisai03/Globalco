package com.globalco.jobboard.notification.repository;

import com.globalco.jobboard.common.security.AccountType;
import com.globalco.jobboard.notification.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findTop100ByAccountTypeAndAccountIdOrderByCreatedAtDesc(AccountType accountType, Long accountId);

    long countByAccountTypeAndAccountIdAndReadFlagFalse(AccountType accountType, Long accountId);

    Optional<Notification> findByIdAndAccountTypeAndAccountId(Long id, AccountType accountType, Long accountId);

    @Modifying
    @Query("UPDATE Notification n SET n.readFlag = true WHERE n.accountType = :type AND n.accountId = :id AND n.readFlag = false")
    int markAllRead(@Param("type") AccountType accountType, @Param("id") Long accountId);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.accountType = :type AND n.accountId = :id")
    int deleteAllForAccount(@Param("type") AccountType accountType, @Param("id") Long accountId);
}
