package com.dohwa.link.repository;

import com.dohwa.link.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {
    Optional<Member> findByEmail(String email);
    List<Member> findByNicknameContainingIgnoreCaseOrderByIdDesc(String keyword);
    boolean existsByNicknameAndIdNot(String nickname, Long id);
}
