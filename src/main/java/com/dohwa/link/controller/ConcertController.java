package com.dohwa.link.controller;

import com.dohwa.link.domain.Concert;
import com.dohwa.link.dto.ApiMessage;
import com.dohwa.link.dto.ConcertRequest;
import com.dohwa.link.service.ConcertService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:412", "http://127.0.0.1:412", "http://localhost:0412", "http://127.0.0.1:0412"})
public class ConcertController {
    private final ConcertService concertService;

    @GetMapping("/api/concerts")
    public List<Concert> concerts() {
        return concertService.findAll();
    }

    @GetMapping("/api/concerts/{concertId}")
    public Concert concert(@PathVariable Long concertId) {
        return concertService.findById(concertId);
    }

    @PostMapping("/api/admin/concerts")
    public Concert create(@Valid @RequestBody ConcertRequest request) {
        return concertService.create(request);
    }

    @PutMapping("/api/admin/concerts/{concertId}")
    public Concert update(@PathVariable Long concertId, @Valid @RequestBody ConcertRequest request) {
        return concertService.update(concertId, request);
    }

    @DeleteMapping("/api/admin/concerts/{concertId}")
    public ApiMessage delete(@PathVariable Long concertId) {
        concertService.delete(concertId);
        return new ApiMessage("怨듭뿰????젣?섏뿀?듬땲??");
    }
}
