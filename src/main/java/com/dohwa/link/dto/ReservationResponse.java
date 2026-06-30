package com.dohwa.link.dto;

import com.dohwa.link.domain.Concert;
import com.dohwa.link.domain.Reservation;
import com.dohwa.link.domain.ReservationStatus;

import java.time.LocalDateTime;

public record ReservationResponse(
        Long id,
        ConcertSummary concert,
        String seatLabel,
        String ticketCode,
        String seatGrade,
        int price,
        String paymentMethod,
        LocalDateTime paymentExpiresAt,
        LocalDateTime paidAt,
        ReservationStatus status,
        LocalDateTime reservedAt
) {
    public static ReservationResponse from(Reservation reservation) {
        return new ReservationResponse(
                reservation.getId(),
                ConcertSummary.from(reservation.getConcert()),
                reservation.getSeatLabel(),
                reservation.getTicketCode(),
                reservation.getSeatGrade(),
                reservation.getPrice(),
                reservation.getPaymentMethod(),
                reservation.getPaymentExpiresAt(),
                reservation.getPaidAt(),
                reservation.getStatus(),
                reservation.getReservedAt()
        );
    }

    public record ConcertSummary(
            Long id,
            String title,
            LocalDateTime concertDate,
            String venue,
            LocalDateTime bookingStartAt,
            LocalDateTime bookingEndAt
    ) {
        public static ConcertSummary from(Concert concert) {
            return new ConcertSummary(
                    concert.getId(),
                    concert.getTitle(),
                    concert.getConcertDate(),
                    concert.getVenue(),
                    concert.getBookingStartAt(),
                    concert.getBookingEndAt()
            );
        }
    }
}
