package com.dohwa.link.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "comment_likes", uniqueConstraints = @UniqueConstraint(columnNames = {"comment_id", "member_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CommentLike {
    @Id @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "comment_like_seq")
    @SequenceGenerator(name = "comment_like_seq", sequenceName = "SEQ_COMMENT_LIKE", allocationSize = 1)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comment_id", nullable = false)
    private Comment comment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;
}
