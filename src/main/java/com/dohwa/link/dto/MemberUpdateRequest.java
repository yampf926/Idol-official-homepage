package com.dohwa.link.dto;

import com.dohwa.link.domain.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MemberUpdateRequest(
        @NotBlank(message = "닉네임을 입력하세요.")
        @Size(max = 10, message = "닉네임은 10자까지 입력할 수 있습니다.")
        String nickname,
        Role role,
        String profileImage
) {
}
