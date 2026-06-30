package com.dohwa.link.controller;

import com.dohwa.link.domain.Notice;
import com.dohwa.link.dto.NoticeRequest;
import com.dohwa.link.service.NoticeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:412", "http://127.0.0.1:412", "http://localhost:0412", "http://127.0.0.1:0412"})
public class NoticeController {
    private final NoticeService noticeService;

    @GetMapping("/api/notices")
    public List<Notice> notices() {
        return noticeService.findAll();
    }

    @GetMapping("/api/notices/{noticeId}")
    public Notice notice(@PathVariable Long noticeId) {
        return noticeService.findById(noticeId);
    }

    @PostMapping("/api/admin/notices")
    public Notice create(@Valid @RequestBody NoticeRequest request) {
        return noticeService.create(request);
    }
}
