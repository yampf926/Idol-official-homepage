package com.dohwa.link.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "event_applies", uniqueConstraints = @UniqueConstraint(columnNames = {"event_id", "member_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EventApply {
    @Id @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "event_apply_seq")
    @SequenceGenerator(name = "event_apply_seq", sequenceName = "SEQ_EVENT_APPLY", allocationSize = 1)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(nullable = false)
    private LocalDateTime appliedAt;
}
