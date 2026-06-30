package com.dohwa.link.controller;

import com.dohwa.link.domain.Artist;
import com.dohwa.link.repository.ArtistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/artists")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:412", "http://127.0.0.1:412", "http://localhost:0412", "http://127.0.0.1:0412"})
public class ArtistController {
    private final ArtistRepository artistRepository;

    @GetMapping("/dohwa")
    public Artist dohwa() {
        return artistRepository.findAll().stream().findFirst().orElseThrow();
    }
}
