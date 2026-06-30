package com.dohwa.link.repository;

import com.dohwa.link.domain.Member;
import com.dohwa.link.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByMemberOrderByCreatedAtDesc(Member member);
    void deleteByMember(Member member);
}
