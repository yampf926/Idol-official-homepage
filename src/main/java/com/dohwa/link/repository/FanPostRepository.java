package com.dohwa.link.repository;

import com.dohwa.link.domain.FanPost;
import com.dohwa.link.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FanPostRepository extends JpaRepository<FanPost, Long> {
    List<FanPost> findAllByOrderByPinnedDescIdDesc();
    List<FanPost> findByAuthorOrderByIdDesc(Member author);
    boolean existsByTitle(String title);
}
