package com.dohwa.link.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "fan_posts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FanPost {
    @Id @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "fan_post_seq")
    @SequenceGenerator(name = "fan_post_seq", sequenceName = "SEQ_FAN_POST", allocationSize = 1)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member author;

    @Column(nullable = false)
    private String boardType;

    @Column(nullable = false)
    private String prefix;

    @Column(nullable = false)
    private String title;

    @Lob
    @Column(nullable = false)
    private String content;

    @Lob
    private String imageUrl;

    @Column(nullable = false)
    private int viewCount;

    @Column(nullable = false)
    private int likeCount;

    @Column(nullable = false)
    private boolean pinned;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public static FanPost seed(Member author, String boardType, String prefix, String title, String content, int viewCount, int likeCount, boolean pinned, LocalDateTime createdAt) {
        FanPost post = new FanPost();
        post.author = author;
        post.boardType = boardType;
        post.prefix = prefix;
        post.title = title;
        post.content = content;
        post.viewCount = viewCount;
        post.likeCount = likeCount;
        post.pinned = pinned;
        post.createdAt = createdAt;
        return post;
    }
}
