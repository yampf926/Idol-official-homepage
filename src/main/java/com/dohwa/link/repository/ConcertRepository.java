package com.dohwa.link.repository;

import com.dohwa.link.domain.Concert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ConcertRepository extends JpaRepository<Concert, Long> {
    Optional<Concert> findFirstByTitle(String title);
}
