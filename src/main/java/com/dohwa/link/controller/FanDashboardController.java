package com.dohwa.link.controller;

import com.dohwa.link.service.FanDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:412", "http://127.0.0.1:412", "http://localhost:0412", "http://127.0.0.1:0412"})
public class FanDashboardController {
    private final FanDashboardService fanDashboardService;

    @GetMapping("/api/fandom/dashboard")
    public Map<String, Object> dashboard(@RequestParam(required = false) Long memberId) {
        return fanDashboardService.dashboard(memberId);
    }
}
