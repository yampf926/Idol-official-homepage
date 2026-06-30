package com.dohwa.link.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @Email @NotBlank String email,
        @NotBlank(message = "닉네임을 입력하세요.")
        @Size(max = 10, message = "닉네임은 10자까지 입력할 수 있습니다.")
        String nickname,
        @NotBlank
        @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$",
                message = "비밀번호는 영문, 숫자, 특수기호를 포함해 8자리 이상이어야 합니다."
        )
        String password
) {
}
