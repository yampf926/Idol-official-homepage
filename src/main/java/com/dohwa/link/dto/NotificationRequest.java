package com.dohwa.link.dto;

import jakarta.validation.constraints.NotBlank;

public record NotificationRequest(Long memberId, @NotBlank String content) {
}
