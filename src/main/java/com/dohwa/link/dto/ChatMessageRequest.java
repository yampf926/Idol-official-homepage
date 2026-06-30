package com.dohwa.link.dto;

import jakarta.validation.constraints.NotBlank;

public record ChatMessageRequest(@NotBlank String content) {
}