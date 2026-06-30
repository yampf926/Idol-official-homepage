package com.dohwa.link.repository;

import com.dohwa.link.domain.FanPost;
import com.dohwa.link.domain.Member;
import com.dohwa.link.domain.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {
    Optional<PostLike> findByPostAndMember(FanPost post, Member member);
    List<PostLike> findByMemberOrderByIdDesc(Member member);
    boolean existsByPostAndMember(FanPost post, Member member);
    void deleteByPost(FanPost post);
    void deleteByMember(Member member);
}
