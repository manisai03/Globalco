package com.globalco.jobboard.service;

import com.globalco.jobboard.dto.request.MessageRequest;
import com.globalco.jobboard.dto.response.ContactResponse;
import com.globalco.jobboard.dto.response.MessageResponse;
import com.globalco.jobboard.exception.BadRequestException;
import com.globalco.jobboard.mapper.EntityMapper;
import com.globalco.jobboard.model.AccountType;
import com.globalco.jobboard.model.Admin;
import com.globalco.jobboard.model.Application;
import com.globalco.jobboard.model.AuthenticatedAccount;
import com.globalco.jobboard.model.Message;
import com.globalco.jobboard.model.User;
import com.globalco.jobboard.repository.ApplicationRepository;
import com.globalco.jobboard.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final ApplicationRepository applicationRepository;
    private final AccountService accountService;
    private final NotificationService notificationService;
    private final ChatSocketService chatSocketService;

    @Transactional
    public MessageResponse sendMessage(MessageRequest request, AuthenticatedAccount sender) {
        AuthenticatedAccount receiver = accountService.resolvePartner(sender.getAccountType(), request.getReceiverId());

        if (sender.getAccountType() == AccountType.USER) {
            List<Message> existing = messageRepository.findConversation(
                    sender.getAccountType(), sender.getId(),
                    receiver.getAccountType(), receiver.getId());
            if (existing.isEmpty()) {
                throw new BadRequestException("Only recruiters can start a conversation");
            }
            boolean recruiterInitiated = existing.stream()
                    .anyMatch(m -> m.getSenderType() == AccountType.ADMIN);
            if (!recruiterInitiated) {
                throw new BadRequestException("You can reply after a recruiter messages you");
            }
        }

        if (sender instanceof Admin admin && receiver instanceof User user) {
            if (!applicationRepository.hasRecruiterViewedApplicant(user.getId(), admin.getId())) {
                throw new BadRequestException("View the candidate's application before messaging them");
            }
        }

        Message message = Message.builder()
                .senderType(sender.getAccountType())
                .senderId(sender.getId())
                .receiverType(receiver.getAccountType())
                .receiverId(receiver.getId())
                .content(request.getContent())
                .build();

        Message saved = messageRepository.save(message);

        if (receiver instanceof User user) {
            notificationService.create(user, "New Message",
                    sender.getFullName() + " sent you a message", "NEW_MESSAGE", saved.getId());
        } else if (receiver instanceof Admin admin) {
            notificationService.create(admin, "New Message",
                    sender.getFullName() + " sent you a message", "NEW_MESSAGE", saved.getId());
        }

        MessageResponse response = toMessageResponse(saved, sender, receiver);
        chatSocketService.deliver(response);
        return response;
    }

    public List<MessageResponse> getConversation(Long partnerId, AuthenticatedAccount currentAccount) {
        AuthenticatedAccount partner = accountService.resolvePartner(currentAccount.getAccountType(), partnerId);
        List<Message> messages = messageRepository.findConversation(
                currentAccount.getAccountType(), currentAccount.getId(),
                partner.getAccountType(), partner.getId());

        messages.forEach(m -> {
            boolean isReceiver = m.getReceiverType().equals(currentAccount.getAccountType())
                    && m.getReceiverId().equals(currentAccount.getId());
            if (isReceiver && !m.getReadFlag()) {
                m.setReadFlag(true);
                messageRepository.save(m);
            }
        });

        return messages.stream()
                .map(m -> toMessageResponse(m, currentAccount))
                .toList();
    }

    public List<ContactResponse> getConversationPartners(AuthenticatedAccount currentAccount) {
        return getAvailableContacts(currentAccount);
    }

    public List<ContactResponse> getAvailableContacts(AuthenticatedAccount currentAccount) {
        Map<Long, ContactResponse> contacts = new LinkedHashMap<>();
        boolean isAdminViewer = currentAccount.getAccountType() == AccountType.ADMIN;
        AccountType partnerType = isAdminViewer ? AccountType.USER : AccountType.ADMIN;

        messageRepository.findConversationPartnerIds(currentAccount.getAccountType(), currentAccount.getId())
                .forEach(partnerId -> {
                    AuthenticatedAccount partner = partnerType == AccountType.USER
                            ? accountService.getUserById(partnerId)
                            : accountService.getAdminById(partnerId);
                    contacts.put(partnerId, toContact(partner, currentAccount));
                });

        if (isAdminViewer && currentAccount instanceof Admin admin) {
            for (Application app : applicationRepository.findByJobCreatedByIdOrderByCreatedAtDesc(admin.getId())) {
                User candidate = app.getUser();
                contacts.putIfAbsent(candidate.getId(), toContact(candidate, currentAccount));
            }
        }

        return new ArrayList<>(contacts.values());
    }

    public long getUnreadCount(AuthenticatedAccount account) {
        return messageRepository.countUnread(account.getAccountType(), account.getId());
    }

    private ContactResponse toContact(AuthenticatedAccount partner, AuthenticatedAccount currentAccount) {
        boolean isAdminViewer = currentAccount.getAccountType() == AccountType.ADMIN;
        boolean identityRevealed = !isAdminViewer
                || partner.getAccountType() != AccountType.USER
                || !(currentAccount instanceof Admin admin)
                || applicationRepository.hasRecruiterViewedApplicant(partner.getId(), admin.getId());

        long unread = messageRepository.countUnreadFromPartner(
                currentAccount.getAccountType(), currentAccount.getId(),
                partner.getAccountType(), partner.getId());
        boolean canReply = isAdminViewer || messageRepository.hasPartnerMessagedAccount(
                currentAccount.getAccountType(), currentAccount.getId(),
                partner.getAccountType(), partner.getId());

        ContactResponse.ContactResponseBuilder builder = ContactResponse.builder()
                .id(partner.getId())
                .fullName(identityRevealed ? partner.getFullName() : EntityMapper.maskedCandidateLabel(partner.getId()))
                .email(identityRevealed ? partner.getEmail() : "View application to reveal")
                .unreadCount(unread)
                .canReply(canReply)
                .identityRevealed(identityRevealed);

        if (partner instanceof Admin admin) {
            builder.companyName(admin.getCompanyName());
        }

        return builder.build();
    }

    private MessageResponse toMessageResponse(Message message, AuthenticatedAccount viewer) {
        String senderName = resolveDisplayName(message.getSenderType(), message.getSenderId(), viewer);
        String receiverName = resolveDisplayName(message.getReceiverType(), message.getReceiverId(), viewer);
        return EntityMapper.toMessageResponse(message, senderName, receiverName);
    }

    private MessageResponse toMessageResponse(Message message, AuthenticatedAccount sender, AuthenticatedAccount receiver) {
        return EntityMapper.toMessageResponse(message, sender.getFullName(), receiver.getFullName());
    }

    private String resolveDisplayName(AccountType type, Long id, AuthenticatedAccount viewer) {
        if (type == AccountType.ADMIN) {
            return accountService.getAdminById(id).getFullName();
        }
        if (viewer.getAccountType() == AccountType.ADMIN && viewer instanceof Admin admin) {
            if (!applicationRepository.hasRecruiterViewedApplicant(id, admin.getId())) {
                return EntityMapper.maskedCandidateLabel(id);
            }
        }
        return accountService.getUserById(id).getFullName();
    }
}
