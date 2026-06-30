package com.dohwa.link.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommentRequest(
        @NotBlank(message = "댓글을 입력해 주세요.")
        @Size(max = 500, message = "댓글은 500자까지 입력할 수 있습니다.")
        String content,
        Long parentId
) {
}
