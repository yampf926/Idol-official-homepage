package com.dohwa.link.service;

import com.dohwa.link.domain.ChatMessage;
import com.dohwa.link.domain.Member;
import com.dohwa.link.domain.Role;
import com.dohwa.link.dto.ChatMessageRequest;
import com.dohwa.link.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatService {
    public static final String DOHWA_EMAIL = "dohwa0412@dohwa.com";

    private final ChatMessageRepository chatMessageRepository;
    private final CurrentMemberProvider currentMemberProvider;

    public List<Map<String, Object>> messages() {
        return chatMessageRepository.findTop80ByOrderByCreatedAtDesc().stream()
                .sorted(Comparator.comparing(ChatMessage::getCreatedAt))
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public Map<String, Object> send(Long memberId, ChatMessageRequest request) {
        Member sender = currentMemberProvider.get(memberId);
        ChatMessage message = chatMessageRepository.save(ChatMessage.builder()
                .sender(sender)
                .content(request.content().trim())
                .artistMessage(DOHWA_EMAIL.equalsIgnoreCase(sender.getEmail()))
                .createdAt(LocalDateTime.now())
                .build());
        return toResponse(message);
    }

    @Transactional
    public void delete(Long messageId, Long memberId) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("채팅 메시지를 찾을 수 없습니다."));
        Member member = currentMemberProvider.get(memberId);
        if (member.getRole() != Role.ADMIN && !message.getSender().getId().equals(member.getId())) {
            throw new IllegalArgumentException("본인 또는 관리자만 채팅을 삭제할 수 있습니다.");
        }
        chatMessageRepository.delete(message);
    }

    private Map<String, Object> toResponse(ChatMessage message) {
        return Map.of(
                "id", message.getId(),
                "senderId", message.getSender().getId(),
                "senderEmail", message.getSender().getEmail(),
                "senderNickname", message.getSender().getNickname(),
                "senderRole", message.getSender().getRole(),
                "content", message.getContent(),
                "artistMessage", message.isArtistMessage(),
                "createdAt", message.getCreatedAt()
        );
    }
}
