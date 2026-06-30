package com.dohwa.link.dto;

import jakarta.validation.constraints.NotBlank;

public record FindEmailRequest(
        @NotBlank(message = "닉네임을 입력하세요.")
        String nickname
) {
}
