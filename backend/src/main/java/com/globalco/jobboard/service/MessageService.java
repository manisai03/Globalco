package com.globalco.jobboard.service;

import com.globalco.jobboard.dto.request.MessageRequest;
import com.globalco.jobboard.dto.response.ContactResponse;
import com.globalco.jobboard.dto.response.MessageResponse;
import com.globalco.jobboard.exception.BadRequestException;
import com.globalco.jobboard.mapper.EntityMapper;
import com.globalco.jobboard.model.AccountType;
import com.globalco.jobboard.model.Admin;
import com.globalco.jobboard.model.AuthenticatedAccount;
import com.globalco.jobboard.model.Message;
import com.globalco.jobboard.model.User;
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

        MessageResponse response = EntityMapper.toMessageResponse(saved, sender.getFullName(), receiver.getFullName());
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
                .map(m -> EntityMapper.toMessageResponse(
                        m,
                        resolveName(m.getSenderType(), m.getSenderId()),
                        resolveName(m.getReceiverType(), m.getReceiverId())))
                .toList();
    }

    public List<ContactResponse> getConversationPartners(AuthenticatedAccount currentAccount) {
        return getAvailableContacts(currentAccount);
    }

    public List<ContactResponse> getAvailableContacts(AuthenticatedAccount currentAccount) {
        Map<Long, ContactResponse> contacts = new LinkedHashMap<>();
        AccountType partnerType = currentAccount.getAccountType() == AccountType.ADMIN
                ? AccountType.USER : AccountType.ADMIN;
        boolean isAdminViewer = currentAccount.getAccountType() == AccountType.ADMIN;

        messageRepository.findConversationPartnerIds(currentAccount.getAccountType(), currentAccount.getId())
                .forEach(partnerId -> {
                    AuthenticatedAccount partner = partnerType == AccountType.USER
                            ? accountService.getUserById(partnerId)
                            : accountService.getAdminById(partnerId);
                    contacts.put(partnerId, toContact(partner, currentAccount, isAdminViewer));
                });

        return new ArrayList<>(contacts.values());
    }

    private ContactResponse toContact(AuthenticatedAccount partner, AuthenticatedAccount currentAccount, boolean isAdminViewer) {
        long unread = messageRepository.countUnreadFromPartner(
                currentAccount.getAccountType(), currentAccount.getId(),
                partner.getAccountType(), partner.getId());
        boolean canReply = isAdminViewer || messageRepository.hasPartnerMessagedAccount(
                currentAccount.getAccountType(), currentAccount.getId(),
                partner.getAccountType(), partner.getId());

        ContactResponse.ContactResponseBuilder builder = ContactResponse.builder()
                .id(partner.getId())
                .fullName(partner.getFullName())
                .email(partner.getEmail())
                .unreadCount(unread)
                .canReply(canReply);

        if (partner instanceof Admin admin) {
            builder.companyName(admin.getCompanyName());
        }

        return builder.build();
    }

    public long getUnreadCount(AuthenticatedAccount account) {
        return messageRepository.countUnread(account.getAccountType(), account.getId());
    }

    private String resolveName(AccountType type, Long id) {
        if (type == AccountType.ADMIN) {
            return accountService.getAdminById(id).getFullName();
        }
        return accountService.getUserById(id).getFullName();
    }
}
