package com.dohwa.link.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public record ConcertRequest(
        @NotBlank String title,
        @NotNull LocalDateTime concertDate,
        LocalDateTime bookingStartAt,
        LocalDateTime bookingEndAt,
        @NotBlank String venue,
        @NotBlank String description,
        int totalSeats,
        Integer vipPrice,
        Integer rPrice,
        Integer sPrice,
        Integer aPrice
) {
}
