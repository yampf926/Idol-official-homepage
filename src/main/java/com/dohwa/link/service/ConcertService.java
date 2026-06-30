package com.dohwa.link.service;

import com.dohwa.link.domain.Concert;
import com.dohwa.link.domain.ReservationStatus;
import com.dohwa.link.dto.ConcertRequest;
import com.dohwa.link.repository.ConcertRepository;
import com.dohwa.link.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ConcertService {
    private static final List<ReservationStatus> ACTIVE_RESERVATION_STATUSES = List.of(ReservationStatus.PAYMENT_PENDING, ReservationStatus.RESERVED);

    private final ConcertRepository concertRepository;
    private final ReservationRepository reservationRepository;

    @Transactional
    public List<Concert> findAll() {
        return concertRepository.findAll().stream()
                .peek(this::syncRemainingSeats)
                .toList();
    }

    @Transactional
    public Concert findById(Long id) {
        Concert concert = concertRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("공연을 찾을 수 없습니다."));
        syncRemainingSeats(concert);
        return concert;
    }

    @Transactional
    public Concert create(ConcertRequest request) {
        return concertRepository.save(Concert.builder()
                .title(request.title())
                .concertDate(request.concertDate())
                .bookingStartAt(bookingStartAt(request))
                .bookingEndAt(bookingEndAt(request))
                .venue(request.venue())
                .description(request.description())
                .totalSeats(request.totalSeats())
                .remainingSeats(request.totalSeats())
                .vipPrice(priceOrDefault(request.vipPrice(), 154000))
                .rPrice(priceOrDefault(request.rPrice(), 132000))
                .sPrice(priceOrDefault(request.sPrice(), 110000))
                .aPrice(priceOrDefault(request.aPrice(), 88000))
                .build());
    }

    @Transactional
    public Concert update(Long id, ConcertRequest request) {
        Concert concert = findById(id);
        concert.setTitle(request.title());
        concert.setConcertDate(request.concertDate());
        concert.setBookingStartAt(bookingStartAt(request));
        concert.setBookingEndAt(bookingEndAt(request));
        concert.setVenue(request.venue());
        concert.setDescription(request.description());
        int reservedCount = reservedCount(concert);
        concert.setTotalSeats(request.totalSeats());
        concert.setRemainingSeats(Math.max(0, request.totalSeats() - reservedCount));
        concert.setVipPrice(priceOrDefault(request.vipPrice(), concert.getVipPrice()));
        concert.setRPrice(priceOrDefault(request.rPrice(), concert.getRPrice()));
        concert.setSPrice(priceOrDefault(request.sPrice(), concert.getSPrice()));
        concert.setAPrice(priceOrDefault(request.aPrice(), concert.getAPrice()));
        return concert;
    }

    @Transactional
    public void delete(Long id) {
        concertRepository.deleteById(id);
    }

    private void syncRemainingSeats(Concert concert) {
        applyTicketDefaults(concert);
        concert.setRemainingSeats(Math.max(0, concert.getTotalSeats() - reservedCount(concert)));
    }

    private int reservedCount(Concert concert) {
        return Math.toIntExact(reservationRepository.countByConcertAndStatusIn(concert, ACTIVE_RESERVATION_STATUSES));
    }

    private LocalDateTime bookingStartAt(ConcertRequest request) {
        return request.bookingStartAt() == null ? request.concertDate().minusDays(30) : request.bookingStartAt();
    }

    private LocalDateTime bookingEndAt(ConcertRequest request) {
        return request.bookingEndAt() == null ? request.concertDate().minusDays(1) : request.bookingEndAt();
    }

    private int priceOrDefault(Integer price, int defaultPrice) {
        return price == null || price < 0 ? defaultPrice : price;
    }

    private void applyTicketDefaults(Concert concert) {
        if (concert.getBookingStartAt() == null) {
            concert.setBookingStartAt(concert.getConcertDate().minusDays(30));
        }
        if (concert.getBookingEndAt() == null) {
            concert.setBookingEndAt(concert.getConcertDate().minusDays(1));
        }
        if (concert.getVipPrice() <= 0) {
            concert.setVipPrice(154000);
        }
        if (concert.getRPrice() <= 0) {
            concert.setRPrice(132000);
        }
        if (concert.getSPrice() <= 0) {
            concert.setSPrice(110000);
        }
        if (concert.getAPrice() <= 0) {
            concert.setAPrice(88000);
        }
    }
}
