package com.globalco.jobboard.repository;

import com.globalco.jobboard.model.AccountType;
import com.globalco.jobboard.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("""
        SELECT m FROM Message m
        WHERE (m.senderType = :type1 AND m.senderId = :id1 AND m.receiverType = :type2 AND m.receiverId = :id2)
           OR (m.senderType = :type2 AND m.senderId = :id2 AND m.receiverType = :type1 AND m.receiverId = :id1)
        ORDER BY m.createdAt ASC
        """)
    List<Message> findConversation(
            AccountType type1, Long id1,
            AccountType type2, Long id2);

    @Query("""
        SELECT DISTINCT CASE
            WHEN m.senderType = :accountType AND m.senderId = :accountId THEN m.receiverId
            ELSE m.senderId
        END
        FROM Message m
        WHERE (m.senderType = :accountType AND m.senderId = :accountId)
           OR (m.receiverType = :accountType AND m.receiverId = :accountId)
        """)
    List<Long> findConversationPartnerIds(AccountType accountType, Long accountId);

    @Query("""
        SELECT COUNT(m) FROM Message m
        WHERE m.receiverType = :accountType AND m.receiverId = :accountId AND m.readFlag = false
        """)
    long countUnread(AccountType accountType, Long accountId);

    @Query("""
        SELECT COUNT(m) FROM Message m
        WHERE m.receiverType = :accountType AND m.receiverId = :accountId
          AND m.senderType = :partnerType AND m.senderId = :partnerId AND m.readFlag = false
        """)
    long countUnreadFromPartner(
            AccountType accountType, Long accountId,
            AccountType partnerType, Long partnerId);

    @Query("""
        SELECT COUNT(m) > 0 FROM Message m
        WHERE m.senderType = :partnerType AND m.senderId = :partnerId
          AND m.receiverType = :accountType AND m.receiverId = :accountId
        """)
    boolean hasPartnerMessagedAccount(
            AccountType accountType, Long accountId,
            AccountType partnerType, Long partnerId);
}
