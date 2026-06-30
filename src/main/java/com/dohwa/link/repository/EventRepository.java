package com.dohwa.link.repository;

import com.dohwa.link.domain.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findAllByOrderByStartAtDesc();
    Optional<Event> findFirstByTitle(String title);
}
