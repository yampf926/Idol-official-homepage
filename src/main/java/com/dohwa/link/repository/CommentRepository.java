package com.dohwa.link.repository;

import com.dohwa.link.domain.Comment;
import com.dohwa.link.domain.FanPost;
import com.dohwa.link.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByPostOrderByCreatedAtAsc(FanPost post);
    List<Comment> findByPostAndParentIsNullOrderByCreatedAtAsc(FanPost post);
    List<Comment> findByAuthorOrderByCreatedAtDesc(Member author);
    long countByPost(FanPost post);
    void deleteByPost(FanPost post);
}
