package com.globalco.jobboard.messaging.repository;

import com.globalco.jobboard.common.security.AccountType;
import com.globalco.jobboard.messaging.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("""
        SELECT m FROM Message m
        WHERE (m.senderType = :type1 AND m.senderId = :id1 AND m.receiverType = :type2 AND m.receiverId = :id2)
           OR (m.senderType = :type2 AND m.senderId = :id2 AND m.receiverType = :type1 AND m.receiverId = :id1)
        ORDER BY m.createdAt ASC
        """)
    List<Message> findConversation(
            @Param("type1") AccountType type1, @Param("id1") Long id1,
            @Param("type2") AccountType type2, @Param("id2") Long id2);

    @Query("""
        SELECT DISTINCT CASE
            WHEN m.senderType = :accountType AND m.senderId = :accountId THEN m.receiverId
            ELSE m.senderId
        END
        FROM Message m
        WHERE (m.senderType = :accountType AND m.senderId = :accountId)
           OR (m.receiverType = :accountType AND m.receiverId = :accountId)
        """)
    List<Long> findConversationPartnerIds(@Param("accountType") AccountType accountType, @Param("accountId") Long accountId);

    @Query("""
        SELECT COUNT(m) FROM Message m
        WHERE m.receiverType = :accountType AND m.receiverId = :accountId AND m.readFlag = false
        """)
    long countUnread(@Param("accountType") AccountType accountType, @Param("accountId") Long accountId);

    /** Unread counts per sender, for the whole contact list in one query. */
    @Query("""
        SELECT m.senderId, COUNT(m) FROM Message m
        WHERE m.receiverType = :accountType AND m.receiverId = :accountId
          AND m.senderType = :partnerType AND m.readFlag = false
        GROUP BY m.senderId
        """)
    List<Object[]> countUnreadByPartner(
            @Param("accountType") AccountType accountType, @Param("accountId") Long accountId,
            @Param("partnerType") AccountType partnerType);

    @Query("""
        SELECT DISTINCT m.senderId FROM Message m
        WHERE m.receiverType = :accountType AND m.receiverId = :accountId AND m.senderType = :partnerType
        """)
    List<Long> findPartnersWhoMessaged(
            @Param("accountType") AccountType accountType, @Param("accountId") Long accountId,
            @Param("partnerType") AccountType partnerType);

    @Modifying
    @Query("""
        UPDATE Message m SET m.readFlag = true
        WHERE m.receiverType = :accountType AND m.receiverId = :accountId
          AND m.senderType = :partnerType AND m.senderId = :partnerId AND m.readFlag = false
        """)
    int markConversationRead(
            @Param("accountType") AccountType accountType, @Param("accountId") Long accountId,
            @Param("partnerType") AccountType partnerType, @Param("partnerId") Long partnerId);

    @Modifying
    @Query("""
        DELETE FROM Message m
        WHERE (m.senderType = :accountType AND m.senderId = :accountId)
           OR (m.receiverType = :accountType AND m.receiverId = :accountId)
        """)
    int deleteAllForAccount(@Param("accountType") AccountType accountType, @Param("accountId") Long accountId);
}
