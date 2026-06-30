package com.dohwa.link.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FanPostRequest(
        @NotBlank(message = "게시판을 선택해 주세요.")
        @Size(max = 30, message = "게시판 값이 너무 깁니다.")
        String boardType,
        @NotBlank(message = "카테고리를 선택해 주세요.")
        @Size(max = 30, message = "카테고리 값이 너무 깁니다.")
        String prefix,
        @NotBlank(message = "제목을 입력해 주세요.")
        @Size(max = 80, message = "제목은 80자까지 입력할 수 있습니다.")
        String title,
        @NotBlank(message = "내용을 입력해 주세요.")
        @Size(max = 2000, message = "내용은 2000자까지 입력할 수 있습니다.")
        String content,
        String imageUrl
) {
}
