package com.dohwa.link.dto;

import jakarta.validation.constraints.NotBlank;

public record ReservationRequest(@NotBlank String seatLabel, String paymentMethod) {
}
