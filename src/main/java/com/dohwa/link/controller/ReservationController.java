package com.dohwa.link.controller;

import com.dohwa.link.dto.ApiMessage;
import com.dohwa.link.dto.ReservationRequest;
import com.dohwa.link.dto.ReservationResponse;
import com.dohwa.link.service.ReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:412", "http://127.0.0.1:412", "http://localhost:0412", "http://127.0.0.1:0412"})
public class ReservationController {
    private final ReservationService reservationService;

    @PostMapping("/api/concerts/{concertId}/reservations")
    public ReservationResponse reserve(@PathVariable Long concertId, @Valid @RequestBody ReservationRequest request, @RequestParam Long memberId) {
        return ReservationResponse.from(reservationService.reserve(concertId, memberId, request));
    }

    @GetMapping("/api/concerts/{concertId}/reserved-seats")
    public List<String> reservedSeats(@PathVariable Long concertId) {
        return reservationService.reservedSeats(concertId);
    }

    @GetMapping("/api/reservations/my")
    public List<ReservationResponse> my(@RequestParam Long memberId) {
        return reservationService.myResponses(memberId);
    }

    @PutMapping("/api/reservations/{reservationId}/pay")
    public ReservationResponse pay(@PathVariable Long reservationId, @RequestParam Long memberId) {
        return ReservationResponse.from(reservationService.completePayment(reservationId, memberId));
    }

    @GetMapping("/api/payments/bank-account")
    public String bankAccount() {
        return reservationService.bankAccount();
    }

    @DeleteMapping("/api/reservations/{reservationId}")
    public ApiMessage cancel(@PathVariable Long reservationId, @RequestParam Long memberId) {
        reservationService.cancel(reservationId, memberId);
        return new ApiMessage("?덈ℓ媛 痍⑥냼?섏뿀?듬땲??");
    }
}
