package com.dohwa.link.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public record EventRequest(@NotBlank String title, @NotBlank String content, @NotNull LocalDateTime startAt, @NotNull LocalDateTime endAt) {
}
