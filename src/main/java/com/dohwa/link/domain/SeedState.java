package com.dohwa.link.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "seed_states")
@Getter
@Setter
@NoArgsConstructor
public class SeedState {
    @Id
    @Column(length = 80)
    private String name;

    @Column(nullable = false)
    private LocalDateTime completedAt;

    public SeedState(String name) {
        this.name = name;
        this.completedAt = LocalDateTime.now();
    }
}
