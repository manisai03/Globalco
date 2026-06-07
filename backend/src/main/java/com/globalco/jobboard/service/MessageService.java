package com.globalco.jobboard.service;

import com.globalco.jobboard.dto.request.MessageRequest;
import com.globalco.jobboard.dto.response.ContactResponse;
import com.globalco.jobboard.dto.response.MessageResponse;
import com.globalco.jobboard.exception.BadRequestException;
import com.globalco.jobboard.exception.ResourceNotFoundException;
import com.globalco.jobboard.mapper.EntityMapper;
import com.globalco.jobboard.model.Message;
import com.globalco.jobboard.model.User;
import com.globalco.jobboard.repository.MessageRepository;
import com.globalco.jobboard.repository.UserRepository;
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
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ChatSocketService chatSocketService;

    @Transactional
    public MessageResponse sendMessage(MessageRequest request, User sender) {
        User receiver = userRepository.findById(request.getReceiverId())
                .orElseThrow(() -> new ResourceNotFoundException("Receiver not found"));

        if (!"ROLE_ADMIN".equals(sender.getRole().getName())) {
            List<Message> existing = messageRepository.findConversation(sender.getId(), receiver.getId());
            if (existing.isEmpty()) {
                throw new BadRequestException("Only recruiters can start a conversation");
            }
            boolean recruiterInitiated = existing.stream()
                    .anyMatch(m -> "ROLE_ADMIN".equals(m.getSender().getRole().getName()));
            if (!recruiterInitiated) {
                throw new BadRequestException("You can reply after a recruiter messages you");
            }
        }

        Message message = Message.builder()
                .sender(sender)
                .receiver(receiver)
                .content(request.getContent())
                .build();

        Message saved = messageRepository.save(message);

        notificationService.create(receiver, "New Message",
                sender.getFullName() + " sent you a message", "NEW_MESSAGE", saved.getId());

        MessageResponse response = EntityMapper.toMessageResponse(saved);
        chatSocketService.deliver(response);
        return response;
    }

    public List<MessageResponse> getConversation(Long partnerId, User currentUser) {
        List<Message> messages = messageRepository.findConversation(currentUser.getId(), partnerId);
        messages.forEach(m -> {
            if (m.getReceiver().getId().equals(currentUser.getId()) && !m.getReadFlag()) {
                m.setReadFlag(true);
                messageRepository.save(m);
            }
        });
        return messages.stream().map(EntityMapper::toMessageResponse).toList();
    }

    public List<ContactResponse> getConversationPartners(User currentUser) {
        return getAvailableContacts(currentUser);
    }

    public List<ContactResponse> getAvailableContacts(User currentUser) {
        Map<Long, ContactResponse> contacts = new LinkedHashMap<>();
        boolean isAdmin = "ROLE_ADMIN".equals(currentUser.getRole().getName());

        if (isAdmin) {
            messageRepository.findConversationPartners(currentUser.getId()).forEach(id ->
                    userRepository.findById(id).ifPresent(u -> contacts.put(u.getId(), toContact(u, currentUser, true))));
        } else {
            messageRepository.findConversationPartners(currentUser.getId()).forEach(id ->
                    userRepository.findById(id).ifPresent(u -> {
                        if ("ROLE_ADMIN".equals(u.getRole().getName())) {
                            contacts.put(u.getId(), toContact(u, currentUser, false));
                        }
                    }));
        }

        return new ArrayList<>(contacts.values());
    }

    private ContactResponse toContact(User partner, User currentUser, boolean isAdminViewer) {
        long unread = messageRepository.countUnreadFromPartner(currentUser.getId(), partner.getId());
        boolean canReply = isAdminViewer || messageRepository.hasRecruiterMessagedUser(currentUser.getId(), partner.getId());
        return ContactResponse.builder()
                .id(partner.getId())
                .fullName(partner.getFullName())
                .email(partner.getEmail())
                .companyName(partner.getCompanyName())
                .unreadCount(unread)
                .canReply(canReply)
                .build();
    }

    public long getUnreadCount(User user) {
        return messageRepository.countByReceiverIdAndReadFlagFalse(user.getId());
    }
}
