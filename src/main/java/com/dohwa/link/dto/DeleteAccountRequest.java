package com.dohwa.link.dto;

import jakarta.validation.constraints.NotBlank;

public record DeleteAccountRequest(
        @NotBlank(message = "비밀번호를 입력하세요.")
        String password
) {
}
