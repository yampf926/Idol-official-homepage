package com.dohwa.link.controller;

import com.dohwa.link.dto.NotificationRequest;
import com.dohwa.link.dto.NotificationResponse;
import com.dohwa.link.dto.ApiMessage;
import com.dohwa.link.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:412", "http://127.0.0.1:412", "http://localhost:0412", "http://127.0.0.1:0412"})
public class NotificationController {
    private final NotificationService notificationService;

    @GetMapping("/api/notifications")
    public List<NotificationResponse> notifications(@RequestParam(defaultValue = "1") Long memberId) {
        return notificationService.myResponses(memberId);
    }

    @PutMapping("/api/notifications/{notificationId}/read")
    public NotificationResponse read(@PathVariable Long notificationId, @RequestParam(defaultValue = "1") Long memberId) {
        return notificationService.readResponse(notificationId, memberId);
    }

    @PutMapping("/api/notifications/read-all")
    public List<NotificationResponse> readAll(@RequestParam(defaultValue = "1") Long memberId) {
        return notificationService.readAllResponses(memberId);
    }

    @PostMapping("/api/admin/notifications")
    public NotificationResponse send(@Valid @RequestBody NotificationRequest request) {
        return NotificationResponse.from(notificationService.send(request));
    }

    @DeleteMapping("/api/notifications/{notificationId}")
    public ApiMessage delete(@PathVariable Long notificationId, @RequestParam(defaultValue = "1") Long memberId) {
        notificationService.delete(notificationId, memberId);
        return new ApiMessage("?뚮┝????젣?섏뿀?듬땲??");
    }

    @DeleteMapping("/api/notifications")
    public ApiMessage deleteAll(@RequestParam(defaultValue = "1") Long memberId) {
        notificationService.deleteAll(memberId);
        return new ApiMessage("?꾩껜 ?뚮┝????젣?섏뿀?듬땲??");
    }
}
