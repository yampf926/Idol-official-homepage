package com.dohwa.link.service;

import com.dohwa.link.domain.Concert;
import com.dohwa.link.domain.Member;
import com.dohwa.link.domain.Notification;
import com.dohwa.link.domain.Reservation;
import com.dohwa.link.domain.ReservationStatus;
import com.dohwa.link.dto.ReservationRequest;
import com.dohwa.link.dto.ReservationResponse;
import com.dohwa.link.repository.ConcertRepository;
import com.dohwa.link.repository.NotificationRepository;
import com.dohwa.link.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReservationService {
    private static final List<ReservationStatus> ACTIVE_STATUSES = List.of(ReservationStatus.PAYMENT_PENDING, ReservationStatus.RESERVED);
    private static final int PAYMENT_TIMEOUT_MINUTES = 10;
    private static final String BANK_ACCOUNT = "국민 123456-78-901234 도화링크";

    private final ReservationRepository reservationRepository;
    private final ConcertRepository concertRepository;
    private final NotificationRepository notificationRepository;
    private final CurrentMemberProvider currentMemberProvider;

    @Transactional
    public Reservation reserve(Long concertId, Long memberId, ReservationRequest request) {
        cancelExpiredPayments();
        Member member = currentMemberProvider.get(memberId);
        Concert concert = concertRepository.findById(concertId)
                .orElseThrow(() -> new IllegalArgumentException("공연을 찾을 수 없습니다."));
        String seatLabel = request.seatLabel().trim().toUpperCase();
        LocalDateTime now = LocalDateTime.now();
        String paymentMethod = normalizePaymentMethod(request.paymentMethod());
        boolean bankTransfer = "BANK_TRANSFER".equals(paymentMethod);

        refreshRemainingSeats(concert);
        validateBookingWindow(concert, now);
        if (reservationRepository.existsByConcertAndMemberAndStatusIn(concert, member, ACTIVE_STATUSES)) {
            throw new IllegalArgumentException("이미 예매한 공연입니다.");
        }
        if (concert.getRemainingSeats() <= 0) {
            throw new IllegalArgumentException("남은 좌석이 없습니다.");
        }
        if (reservationRepository.existsByConcertAndSeatLabelAndStatusIn(concert, seatLabel, ACTIVE_STATUSES)) {
            throw new IllegalArgumentException("이미 예매된 좌석입니다.");
        }

        String seatGrade = seatGrade(seatLabel);
        int price = seatPrice(concert, seatGrade);
        concert.setRemainingSeats(concert.getRemainingSeats() - 1);
        Reservation reservation = reservationRepository.save(Reservation.builder()
                .member(member)
                .concert(concert)
                .seatLabel(seatLabel)
                .ticketCode(ticketCode(concert, member, seatLabel, now))
                .seatGrade(seatGrade)
                .price(price)
                .paymentMethod(paymentMethod)
                .paymentExpiresAt(bankTransfer ? now.plusMinutes(PAYMENT_TIMEOUT_MINUTES) : null)
                .paidAt(bankTransfer ? null : now)
                .status(bankTransfer ? ReservationStatus.PAYMENT_PENDING : ReservationStatus.RESERVED)
                .reservedAt(now)
                .build());
        notificationRepository.save(Notification.builder()
                .member(member)
                .content(bankTransfer
                        ? concert.getTitle() + " " + seatLabel + " " + seatGrade + "석 입금 대기 중입니다. 10분 안에 입금 완료 처리하세요."
                        : concert.getTitle() + " " + seatLabel + " " + seatGrade + "석 예매가 완료되었습니다.")
                .read(false)
                .createdAt(now)
                .build());
        refreshRemainingSeats(concert);
        return reservation;
    }

    @Transactional
    public List<Reservation> my(Long memberId) {
        cancelExpiredPayments();
        return reservationRepository.findByMemberOrderByReservedAtDesc(currentMemberProvider.get(memberId));
    }

    @Transactional
    public List<ReservationResponse> myResponses(Long memberId) {
        return my(memberId).stream()
                .map(ReservationResponse::from)
                .toList();
    }

    @Transactional
    public List<String> reservedSeats(Long concertId) {
        cancelExpiredPayments();
        Concert concert = concertRepository.findById(concertId)
                .orElseThrow(() -> new IllegalArgumentException("공연을 찾을 수 없습니다."));
        return reservationRepository.findByConcertAndStatusIn(concert, ACTIVE_STATUSES).stream()
                .map(Reservation::getSeatLabel)
                .toList();
    }

    @Transactional
    public Reservation completePayment(Long reservationId, Long memberId) {
        cancelExpiredPayments();
        Member member = currentMemberProvider.get(memberId);
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("예매를 찾을 수 없습니다."));
        if (!reservation.getMember().getId().equals(member.getId())) {
            throw new IllegalArgumentException("본인 예매만 결제할 수 있습니다.");
        }
        if (reservation.getStatus() == ReservationStatus.RESERVED) {
            return reservation;
        }
        if (reservation.getStatus() == ReservationStatus.CANCELED) {
            throw new IllegalArgumentException("취소된 예매는 결제할 수 없습니다.");
        }

        LocalDateTime now = LocalDateTime.now();
        if (reservation.getPaymentExpiresAt() != null && now.isAfter(reservation.getPaymentExpiresAt())) {
            expireReservation(reservation, now);
            throw new IllegalArgumentException("입금 시간이 지나 예매가 자동 취소되었습니다.");
        }

        reservation.setStatus(ReservationStatus.RESERVED);
        reservation.setPaidAt(now);
        refreshRemainingSeats(reservation.getConcert());
        notificationRepository.save(Notification.builder()
                .member(member)
                .content(reservation.getConcert().getTitle() + " " + reservation.getSeatLabel() + " 좌석 결제가 완료되었습니다.")
                .read(false)
                .createdAt(now)
                .build());
        return reservation;
    }

    @Transactional
    public void cancel(Long reservationId, Long memberId) {
        cancelExpiredPayments();
        Member member = currentMemberProvider.get(memberId);
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("예매를 찾을 수 없습니다."));
        if (!reservation.getMember().getId().equals(member.getId())) {
            throw new IllegalArgumentException("본인 예매만 취소할 수 있습니다.");
        }
        if (reservation.getStatus() == ReservationStatus.CANCELED) {
            return;
        }
        if (reservation.getStatus() == ReservationStatus.RESERVED && reservation.getConcert().getConcertDate().minusDays(1).isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("공연 하루 전부터는 예매를 취소할 수 없습니다.");
        }

        reservation.setStatus(ReservationStatus.CANCELED);
        Concert concert = reservation.getConcert();
        refreshRemainingSeats(concert);
        notificationRepository.save(Notification.builder()
                .member(member)
                .content(concert.getTitle() + " " + reservation.getSeatLabel() + " 좌석 예매가 취소되었습니다.")
                .read(false)
                .createdAt(LocalDateTime.now())
                .build());
    }

    @Scheduled(initialDelay = 30000, fixedDelay = 30000)
    @Transactional
    public void cancelExpiredPayments() {
        LocalDateTime now = LocalDateTime.now();
        reservationRepository.findByStatusAndPaymentExpiresAtBefore(ReservationStatus.PAYMENT_PENDING, now)
                .forEach(reservation -> expireReservation(reservation, now));
    }

    public String bankAccount() {
        return BANK_ACCOUNT;
    }

    private void refreshRemainingSeats(Concert concert) {
        int reservedCount = Math.toIntExact(reservationRepository.countByConcertAndStatusIn(concert, ACTIVE_STATUSES));
        concert.setRemainingSeats(Math.max(0, concert.getTotalSeats() - reservedCount));
    }

    private void expireReservation(Reservation reservation, LocalDateTime now) {
        if (reservation.getStatus() != ReservationStatus.PAYMENT_PENDING) {
            return;
        }
        reservation.setStatus(ReservationStatus.CANCELED);
        Concert concert = reservation.getConcert();
        refreshRemainingSeats(concert);
        notificationRepository.save(Notification.builder()
                .member(reservation.getMember())
                .content(concert.getTitle() + " " + reservation.getSeatLabel() + " 좌석 예매가 미입금으로 자동 취소되었습니다.")
                .read(false)
                .createdAt(now)
                .build());
    }

    private void validateBookingWindow(Concert concert, LocalDateTime now) {
        LocalDateTime bookingStartAt = concert.getBookingStartAt() == null ? concert.getConcertDate().minusDays(30) : concert.getBookingStartAt();
        LocalDateTime bookingEndAt = concert.getBookingEndAt() == null ? concert.getConcertDate().minusDays(1) : concert.getBookingEndAt();
        if (now.isBefore(bookingStartAt)) {
            throw new IllegalArgumentException("아직 예매가 시작되지 않았습니다.");
        }
        if (now.isAfter(bookingEndAt)) {
            throw new IllegalArgumentException("예매가 마감되었습니다.");
        }
    }

    private String normalizePaymentMethod(String paymentMethod) {
        if (paymentMethod == null || paymentMethod.isBlank()) {
            return "BANK_TRANSFER";
        }
        String normalized = paymentMethod.trim().toUpperCase();
        return switch (normalized) {
            case "BANK_TRANSFER", "CARD", "KAKAO_PAY" -> normalized;
            default -> throw new IllegalArgumentException("지원하지 않는 결제 방식입니다.");
        };
    }

    private String seatGrade(String seatLabel) {
        if (seatLabel.startsWith("A")) {
            return "VIP";
        }
        if (seatLabel.startsWith("B") || seatLabel.startsWith("C")) {
            return "R";
        }
        if (seatLabel.startsWith("D") || seatLabel.startsWith("E") || seatLabel.startsWith("F")) {
            return "S";
        }
        return "A";
    }

    private int seatPrice(Concert concert, String seatGrade) {
        return switch (seatGrade) {
            case "VIP" -> concert.getVipPrice() <= 0 ? 154000 : concert.getVipPrice();
            case "R" -> concert.getRPrice() <= 0 ? 132000 : concert.getRPrice();
            case "S" -> concert.getSPrice() <= 0 ? 110000 : concert.getSPrice();
            default -> concert.getAPrice() <= 0 ? 88000 : concert.getAPrice();
        };
    }

    private String ticketCode(Concert concert, Member member, String seatLabel, LocalDateTime now) {
        return "DHW-%s-%d-%d-%s".formatted(
                now.toLocalDate().toString().replace("-", ""),
                concert.getId(),
                member.getId(),
                seatLabel
        );
    }
}
