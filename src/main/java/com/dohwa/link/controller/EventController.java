package com.dohwa.link.controller;

import com.dohwa.link.domain.Event;
import com.dohwa.link.domain.EventApply;
import com.dohwa.link.dto.EventRequest;
import com.dohwa.link.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:412", "http://127.0.0.1:412", "http://localhost:0412", "http://127.0.0.1:0412"})
public class EventController {
    private final EventService eventService;

    @GetMapping("/api/events")
    public List<Map<String, Object>> events() {
        return eventService.findAll().stream().map(this::response).toList();
    }

    @GetMapping("/api/events/{eventId}")
    public Map<String, Object> event(@PathVariable Long eventId) {
        return response(eventService.findById(eventId));
    }

    @PostMapping("/api/admin/events")
    public Map<String, Object> create(@Valid @RequestBody EventRequest request) {
        return response(eventService.create(request));
    }

    @PostMapping("/api/events/{eventId}/apply")
    public EventApply apply(@PathVariable Long eventId, @RequestParam(defaultValue = "1") Long memberId) {
        return eventService.apply(eventId, memberId);
    }

    @GetMapping("/api/events/my")
    public List<EventApply> my(@RequestParam(defaultValue = "1") Long memberId) {
        return eventService.my(memberId);
    }

    private Map<String, Object> response(Event event) {
        return Map.of(
                "id", event.getId(),
                "title", event.getTitle(),
                "content", event.getContent(),
                "startAt", event.getStartAt(),
                "endAt", event.getEndAt(),
                "applyCount", eventService.applyCount(event)
        );
    }
}
