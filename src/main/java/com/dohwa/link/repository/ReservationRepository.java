package com.dohwa.link.repository;

import com.dohwa.link.domain.Concert;
import com.dohwa.link.domain.Member;
import com.dohwa.link.domain.Reservation;
import com.dohwa.link.domain.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findByMemberOrderByReservedAtDesc(Member member);
    List<Reservation> findByConcertAndStatus(Concert concert, ReservationStatus status);
    List<Reservation> findByConcertAndStatusIn(Concert concert, List<ReservationStatus> statuses);
    List<Reservation> findByStatusAndPaymentExpiresAtBefore(ReservationStatus status, LocalDateTime paymentExpiresAt);
    long countByConcertAndStatus(Concert concert, ReservationStatus status);
    long countByConcertAndStatusIn(Concert concert, List<ReservationStatus> statuses);
    boolean existsByConcertAndSeatLabelAndStatus(Concert concert, String seatLabel, ReservationStatus status);
    boolean existsByConcertAndSeatLabelAndStatusIn(Concert concert, String seatLabel, List<ReservationStatus> statuses);
    boolean existsByConcertAndMemberAndStatus(Concert concert, Member member, ReservationStatus status);
    boolean existsByConcertAndMemberAndStatusIn(Concert concert, Member member, List<ReservationStatus> statuses);
    void deleteByMember(Member member);
}
