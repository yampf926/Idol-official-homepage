package com.dohwa.link.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "concerts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Concert {
    @Id @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "concert_seq")
    @SequenceGenerator(name = "concert_seq", sequenceName = "SEQ_CONCERT", allocationSize = 1)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private LocalDateTime concertDate;

    private LocalDateTime bookingStartAt;

    private LocalDateTime bookingEndAt;

    @Column(nullable = false)
    private String venue;

    @Lob
    private String description;

    @Column(nullable = false)
    private int totalSeats;

    @Column(nullable = false)
    private int remainingSeats;

    private int vipPrice;

    private int rPrice;

    private int sPrice;

    private int aPrice;

    public static Concert seed(String title, LocalDateTime concertDate, String venue, String description, int totalSeats, int remainingSeats) {
        Concert concert = new Concert();
        concert.title = title;
        concert.concertDate = concertDate;
        concert.venue = venue;
        concert.description = description;
        concert.totalSeats = totalSeats;
        concert.remainingSeats = remainingSeats;
        concert.bookingStartAt = concertDate.minusDays(30);
        concert.bookingEndAt = concertDate.minusDays(1);
        concert.vipPrice = 154000;
        concert.rPrice = 132000;
        concert.sPrice = 110000;
        concert.aPrice = 88000;
        return concert;
    }
}
