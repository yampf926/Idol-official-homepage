package com.dohwa.link.repository;

import com.dohwa.link.domain.Notice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface NoticeRepository extends JpaRepository<Notice, Long> {
    List<Notice> findAllByOrderByCreatedAtDesc();
    Optional<Notice> findFirstByTitle(String title);
}
