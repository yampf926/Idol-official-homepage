package com.dohwa.link.service;

import com.dohwa.link.domain.Member;
import com.dohwa.link.domain.Notification;
import com.dohwa.link.dto.NotificationRequest;
import com.dohwa.link.dto.NotificationResponse;
import com.dohwa.link.repository.MemberRepository;
import com.dohwa.link.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final MemberRepository memberRepository;
    private final CurrentMemberProvider currentMemberProvider;

    public List<Notification> my(Long memberId) {
        return notificationRepository.findByMemberOrderByCreatedAtDesc(currentMemberProvider.get(memberId));
    }

    public List<NotificationResponse> myResponses(Long memberId) {
        return my(memberId).stream()
                .map(NotificationResponse::from)
                .toList();
    }

    @Transactional
    public Notification send(NotificationRequest request) {
        Member member = memberRepository.findById(request.memberId())
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));
        return notificationRepository.save(Notification.builder()
                .member(member)
                .content(request.content())
                .read(false)
                .createdAt(LocalDateTime.now())
                .build());
    }

    @Transactional
    public Notification read(Long notificationId, Long memberId) {
        Member member = currentMemberProvider.get(memberId);
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("알림을 찾을 수 없습니다."));
        if (!notification.getMember().getId().equals(member.getId())) {
            throw new IllegalArgumentException("본인의 알림만 읽을 수 있습니다.");
        }
        notification.setRead(true);
        return notification;
    }

    @Transactional
    public NotificationResponse readResponse(Long notificationId, Long memberId) {
        return NotificationResponse.from(read(notificationId, memberId));
    }

    @Transactional
    public List<Notification> readAll(Long memberId) {
        Member member = currentMemberProvider.get(memberId);
        List<Notification> notifications = notificationRepository.findByMemberOrderByCreatedAtDesc(member);
        notifications.forEach(notification -> notification.setRead(true));
        return notifications;
    }

    @Transactional
    public List<NotificationResponse> readAllResponses(Long memberId) {
        return readAll(memberId).stream()
                .map(NotificationResponse::from)
                .toList();
    }

    @Transactional
    public void delete(Long notificationId, Long memberId) {
        Member member = currentMemberProvider.get(memberId);
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("알림을 찾을 수 없습니다."));
        if (!notification.getMember().getId().equals(member.getId())) {
            throw new IllegalArgumentException("본인의 알림만 삭제할 수 있습니다.");
        }
        notificationRepository.delete(notification);
    }

    @Transactional
    public void deleteAll(Long memberId) {
        notificationRepository.deleteByMember(currentMemberProvider.get(memberId));
    }
}
