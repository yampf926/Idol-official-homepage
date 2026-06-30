package com.dohwa.link.service;

import com.dohwa.link.domain.*;
import com.dohwa.link.dto.EventRequest;
import com.dohwa.link.repository.EventApplyRepository;
import com.dohwa.link.repository.EventRepository;
import com.dohwa.link.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EventService {
    private final EventRepository eventRepository;
    private final EventApplyRepository eventApplyRepository;
    private final NotificationRepository notificationRepository;
    private final CurrentMemberProvider currentMemberProvider;

    public List<Event> findAll() {
        return eventRepository.findAllByOrderByStartAtDesc();
    }

    public Event findById(Long id) {
        return eventRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("이벤트를 찾을 수 없습니다."));
    }

    @Transactional
    public Event create(EventRequest request) {
        return eventRepository.save(Event.builder().title(request.title()).content(request.content()).startAt(request.startAt()).endAt(request.endAt()).build());
    }

    @Transactional
    public EventApply apply(Long eventId, Long memberId) {
        Member member = currentMemberProvider.get(memberId);
        Event event = findById(eventId);
        eventApplyRepository.findByEventAndMember(event, member).ifPresent(apply -> { throw new IllegalArgumentException("이미 응모한 이벤트입니다."); });
        EventApply apply = eventApplyRepository.save(EventApply.builder().event(event).member(member).appliedAt(LocalDateTime.now()).build());
        notificationRepository.save(Notification.builder().member(member).content(event.getTitle() + " 응모가 완료되었습니다.").read(false).createdAt(LocalDateTime.now()).build());
        return apply;
    }

    public List<EventApply> my(Long memberId) {
        return eventApplyRepository.findByMemberOrderByAppliedAtDesc(currentMemberProvider.get(memberId));
    }

    public long applyCount(Event event) {
        return eventApplyRepository.countByEvent(event);
    }
}
