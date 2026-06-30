package com.dohwa.link.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "artists")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Artist {
    @Id @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "artist_seq")
    @SequenceGenerator(name = "artist_seq", sequenceName = "SEQ_ARTIST", allocationSize = 1)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Lob
    private String description;

    private String profileImage;

    public static Artist seed(String name, String description, String profileImage) {
        Artist artist = new Artist();
        artist.name = name;
        artist.description = description;
        artist.profileImage = profileImage;
        return artist;
    }
}
