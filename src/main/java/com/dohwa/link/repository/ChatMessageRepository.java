package com.dohwa.link.repository;

import com.dohwa.link.domain.ChatMessage;
import com.dohwa.link.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findTop80ByOrderByCreatedAtDesc();
    void deleteBySender(Member sender);
}
