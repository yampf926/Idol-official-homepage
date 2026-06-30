package com.dohwa.link.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatMessage {
    @Id @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "chat_message_seq")
    @SequenceGenerator(name = "chat_message_seq", sequenceName = "SEQ_CHAT_MESSAGE", allocationSize = 1)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member sender;

    @Lob
    @Column(nullable = false)
    private String content;

    @Column(nullable = false)
    private boolean artistMessage;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public static ChatMessage seed(Member sender, String content, boolean artistMessage, LocalDateTime createdAt) {
        ChatMessage message = new ChatMessage();
        message.sender = sender;
        message.content = content;
        message.artistMessage = artistMessage;
        message.createdAt = createdAt;
        return message;
    }
}
