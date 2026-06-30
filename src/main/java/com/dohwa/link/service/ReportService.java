package com.dohwa.link.service;

import com.dohwa.link.domain.Member;
import com.dohwa.link.domain.Report;
import com.dohwa.link.domain.ReportStatus;
import com.dohwa.link.dto.ReportRequest;
import com.dohwa.link.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {
    private final ReportRepository reportRepository;
    private final CurrentMemberProvider currentMemberProvider;

    @Transactional
    public Map<String, Object> create(ReportRequest request, Long memberId) {
        String targetType = normalizeTargetType(request.targetType());
        Member reporter = currentMemberProvider.get(memberId);
        Report report = reportRepository.save(Report.builder()
                .reporter(reporter)
                .targetType(targetType)
                .targetId(request.targetId())
                .reason(request.reason().trim())
                .status(ReportStatus.OPEN)
                .createdAt(LocalDateTime.now())
                .build());
        return toResponse(report);
    }

    public List<Map<String, Object>> findAll(String status) {
        if ("OPEN".equalsIgnoreCase(status)) {
            return reportRepository.findByStatusOrderByCreatedAtDesc(ReportStatus.OPEN).stream().map(this::toResponse).toList();
        }
        if ("RESOLVED".equalsIgnoreCase(status)) {
            return reportRepository.findByStatusOrderByCreatedAtDesc(ReportStatus.RESOLVED).stream().map(this::toResponse).toList();
        }
        return reportRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
    }

    @Transactional
    public Map<String, Object> resolve(Long reportId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("신고를 찾을 수 없습니다."));
        report.setStatus(ReportStatus.RESOLVED);
        report.setResolvedAt(LocalDateTime.now());
        return toResponse(report);
    }

    private String normalizeTargetType(String targetType) {
        String clean = targetType == null ? "" : targetType.trim().toUpperCase();
        if (!clean.equals("POST") && !clean.equals("COMMENT")) {
            throw new IllegalArgumentException("신고 대상은 게시글 또는 댓글이어야 합니다.");
        }
        return clean;
    }

    private Map<String, Object> toResponse(Report report) {
        return Map.of(
                "id", report.getId(),
                "targetType", report.getTargetType(),
                "targetId", report.getTargetId(),
                "reason", report.getReason(),
                "status", report.getStatus(),
                "reporterId", report.getReporter().getId(),
                "reporter", report.getReporter().getNickname(),
                "createdAt", report.getCreatedAt(),
                "resolvedAt", report.getResolvedAt() == null ? "" : report.getResolvedAt()
        );
    }
}
