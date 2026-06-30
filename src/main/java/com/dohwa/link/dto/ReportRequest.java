package com.dohwa.link.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReportRequest(
        @NotBlank(message = "신고 대상을 선택해 주세요.")
        String targetType,

        @NotNull(message = "신고 대상 ID가 필요합니다.")
        Long targetId,

        @NotBlank(message = "신고 사유를 입력해 주세요.")
        @Size(max = 500, message = "신고 사유는 500자까지 입력할 수 있습니다.")
        String reason
) {
}
