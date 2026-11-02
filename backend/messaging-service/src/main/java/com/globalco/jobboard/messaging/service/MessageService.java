package com.globalco.jobboard.messaging.service;

import com.globalco.jobboard.common.dto.request.MessageRequest;
import com.globalco.jobboard.common.dto.response.ContactResponse;
import com.globalco.jobboard.common.dto.response.MessageResponse;
import com.globalco.jobboard.common.event.EventPublisher;
import com.globalco.jobboard.common.event.EventTopics;
import com.globalco.jobboard.common.event.Events;
import com.globalco.jobboard.common.exception.BadRequestException;
import com.globalco.jobboard.common.security.AccountPrincipal;
import com.globalco.jobboard.common.security.AccountType;
import com.globalco.jobboard.common.util.RecruiterCompanyUtils;
import com.globalco.jobboard.messaging.model.Message;
import com.globalco.jobboard.messaging.repository.MessageRepository;
import com.globalco.jobboard.messaging.service.ParticipantDirectory.Participant;
import com.globalco.jobboard.messaging.websocket.ChatSessionRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageService {

    private static final String HIDDEN_EMAIL = "View application to reveal";

    private final MessageRepository messageRepository;
    private final ParticipantDirectory directory;
    private final ChatSessionRegistry chatSessions;
    private final EventPublisher eventPublisher;
    private final TransactionTemplate transactionTemplate;

    public MessageResponse sendMessage(MessageRequest request, AccountPrincipal sender) {
        Participant receiver = directory.get(ParticipantDirectory.partnerType(sender), request.getReceiverId());

        if (sender.isUser()) {
            List<Message> existing = messageRepository.findConversation(
                    sender.accountType(), sender.id(), receiver.type(), receiver.id());
            if (existing.isEmpty()) {
                throw new BadRequestException("Only recruiters can start a conversation");
            }
            if (existing.stream().noneMatch(m -> m.getSenderType() == AccountType.ADMIN)) {
                throw new BadRequestException("You can reply after a recruiter messages you");
            }
        } else if (!directory.hasRecruiterViewed(receiver.id(), sender.id())) {
            throw new BadRequestException("View the candidate's application before messaging them");
        }

        String senderName = displayNameOf(sender);
        MessageResponse response = transactionTemplate.execute(tx -> {
            Message saved = messageRepository.save(Message.builder()
                    .senderType(sender.accountType())
                    .senderId(sender.id())
                    .receiverType(receiver.type())
                    .receiverId(receiver.id())
                    .content(request.getContent())
                    .build());
            eventPublisher.publish(EventTopics.MESSAGE_SENT, new Events.MessageSent(
                    saved.getId(), receiver.type(), receiver.id(), senderName));
            return toResponse(saved, senderName, receiver.fullName());
        });
        chatSessions.deliver(response);
        return response;
    }

    public List<MessageResponse> getConversation(Long partnerId, AccountPrincipal viewer) {
        AccountType partnerType = ParticipantDirectory.partnerType(viewer);
        Participant partner = directory.get(partnerType, partnerId);
        String partnerName = viewer.isAdmin() && !directory.hasRecruiterViewed(partnerId, viewer.id())
                ? RecruiterCompanyUtils.maskedCandidateLabel(partnerId)
                : partner.fullName();
        String viewerName = displayNameOf(viewer);

        List<Message> messages = messageRepository.findConversation(
                viewer.accountType(), viewer.id(), partnerType, partnerId);
        if (messages.stream().anyMatch(m -> isUnreadFor(m, viewer))) {
            transactionTemplate.executeWithoutResult(tx -> messageRepository.markConversationRead(
                    viewer.accountType(), viewer.id(), partnerType, partnerId));
            messages.stream().filter(m -> isUnreadFor(m, viewer)).forEach(m -> m.setReadFlag(true));
        }

        return messages.stream()
                .map(m -> m.getSenderType() == viewer.accountType() && m.getSenderId().equals(viewer.id())
                        ? toResponse(m, viewerName, partnerName)
                        : toResponse(m, partnerName, viewerName))
                .toList();
    }

    /**
     * Everyone the viewer has talked to; recruiters additionally see every candidate who applied to
     * their jobs. Built from three batch lookups instead of per-contact calls.
     */
    public List<ContactResponse> getContacts(AccountPrincipal viewer) {
        boolean isRecruiter = viewer.isAdmin();
        AccountType partnerType = ParticipantDirectory.partnerType(viewer);

        Set<Long> partnerIds = new LinkedHashSet<>(
                messageRepository.findConversationPartnerIds(viewer.accountType(), viewer.id()));
        if (isRecruiter) {
            partnerIds.addAll(directory.candidateIds(viewer.id()));
        }
        if (partnerIds.isEmpty()) return List.of();

        Map<Long, Participant> participants = directory.getAll(partnerType, partnerIds).stream()
                .collect(Collectors.toMap(Participant::id, Function.identity(), (a, b) -> a));
        Set<Long> viewed = isRecruiter ? directory.viewedCandidateIds(viewer.id()) : Set.of();
        Set<Long> messagedViewer = isRecruiter ? Set.of() : new HashSet<>(
                messageRepository.findPartnersWhoMessaged(viewer.accountType(), viewer.id(), partnerType));
        Map<Long, Long> unread = new HashMap<>();
        messageRepository.countUnreadByPartner(viewer.accountType(), viewer.id(), partnerType)
                .forEach(row -> unread.put((Long) row[0], ((Number) row[1]).longValue()));

        List<ContactResponse> contacts = new ArrayList<>();
        for (Long id : partnerIds) {
            Participant partner = participants.get(id);
            if (partner == null) continue;
            boolean revealed = !isRecruiter || viewed.contains(id);
            contacts.add(ContactResponse.builder()
                    .id(id)
                    .fullName(revealed ? partner.fullName() : RecruiterCompanyUtils.maskedCandidateLabel(id))
                    .email(revealed ? partner.email() : HIDDEN_EMAIL)
                    .companyName(partner.companyName())
                    .unreadCount(unread.getOrDefault(id, 0L))
                    .canReply(isRecruiter || messagedViewer.contains(id))
                    .identityRevealed(revealed)
                    .build());
        }
        return contacts;
    }

    public long getUnreadCount(AccountPrincipal account) {
        return messageRepository.countUnread(account.accountType(), account.id());
    }

    /** Current profile name; falls back to the name in the token if auth-service is unreachable. */
    private String displayNameOf(AccountPrincipal account) {
        try {
            return directory.get(account.accountType(), account.id()).fullName();
        } catch (RuntimeException e) {
            log.warn("Using token name for {} {}: {}", account.accountType(), account.id(), e.getMessage());
            return account.fullName();
        }
    }

    private static boolean isUnreadFor(Message m, AccountPrincipal viewer) {
        return m.getReceiverType() == viewer.accountType()
                && m.getReceiverId().equals(viewer.id())
                && !Boolean.TRUE.equals(m.getReadFlag());
    }

    private static MessageResponse toResponse(Message message, String senderName, String receiverName) {
        return MessageResponse.builder()
                .id(message.getId())
                .senderId(message.getSenderId())
                .senderAccountType(message.getSenderType())
                .senderName(senderName)
                .receiverId(message.getReceiverId())
                .receiverAccountType(message.getReceiverType())
                .receiverName(receiverName)
                .content(message.getContent())
                .read(message.getReadFlag())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
