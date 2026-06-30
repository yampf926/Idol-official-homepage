package com.dohwa.link.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PasswordChangeRequest(
        @NotBlank String currentPassword,
        @NotBlank
        @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$",
                message = "비밀번호는 영문, 숫자, 특수기호를 포함해 8자리 이상이어야 합니다."
        )
        String newPassword
) {
}
