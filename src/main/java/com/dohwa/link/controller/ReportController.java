package com.dohwa.link.controller;

import com.dohwa.link.dto.ReportRequest;
import com.dohwa.link.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:412", "http://127.0.0.1:412", "http://localhost:0412", "http://127.0.0.1:0412"})
public class ReportController {
    private final ReportService reportService;

    @PostMapping("/api/reports")
    public Map<String, Object> create(@Valid @RequestBody ReportRequest request, @RequestParam(defaultValue = "1") Long memberId) {
        return reportService.create(request, memberId);
    }

    @GetMapping("/api/admin/reports")
    public List<Map<String, Object>> reports(@RequestParam(defaultValue = "ALL") String status) {
        return reportService.findAll(status);
    }

    @PutMapping("/api/admin/reports/{reportId}/resolve")
    public Map<String, Object> resolve(@PathVariable Long reportId) {
        return reportService.resolve(reportId);
    }
}
