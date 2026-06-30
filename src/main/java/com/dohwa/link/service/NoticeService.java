package com.dohwa.link.service;

import com.dohwa.link.domain.Notice;
import com.dohwa.link.dto.NoticeRequest;
import com.dohwa.link.repository.NoticeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NoticeService {
    private final NoticeRepository noticeRepository;

    public List<Notice> findAll() {
        return noticeRepository.findAllByOrderByCreatedAtDesc();
    }

    public Notice findById(Long id) {
        return noticeRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("공지를 찾을 수 없습니다."));
    }

    @Transactional
    public Notice create(NoticeRequest request) {
        return noticeRepository.save(Notice.builder().title(request.title()).content(request.content()).createdAt(LocalDateTime.now()).build());
    }
}
