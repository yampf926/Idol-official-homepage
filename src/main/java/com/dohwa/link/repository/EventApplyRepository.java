package com.dohwa.link.repository;

import com.dohwa.link.domain.Event;
import com.dohwa.link.domain.EventApply;
import com.dohwa.link.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface EventApplyRepository extends JpaRepository<EventApply, Long> {
    Optional<EventApply> findByEventAndMember(Event event, Member member);
    List<EventApply> findByMemberOrderByAppliedAtDesc(Member member);
    long countByEvent(Event event);
    void deleteByMember(Member member);
}
