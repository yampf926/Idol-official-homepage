package com.dohwa.link.repository;

import com.dohwa.link.domain.Comment;
import com.dohwa.link.domain.CommentLike;
import com.dohwa.link.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CommentLikeRepository extends JpaRepository<CommentLike, Long> {
    Optional<CommentLike> findByCommentAndMember(Comment comment, Member member);
    boolean existsByCommentAndMember(Comment comment, Member member);
    void deleteByComment(Comment comment);
    void deleteByMember(Member member);
}
