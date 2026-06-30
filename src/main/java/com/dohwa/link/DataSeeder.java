package com.dohwa.link;

import com.dohwa.link.domain.Artist;
import com.dohwa.link.domain.Comment;
import com.dohwa.link.domain.Concert;
import com.dohwa.link.domain.Event;
import com.dohwa.link.domain.FanPost;
import com.dohwa.link.domain.Member;
import com.dohwa.link.domain.Notice;
import com.dohwa.link.domain.Role;
import com.dohwa.link.repository.ArtistRepository;
import com.dohwa.link.repository.CommentLikeRepository;
import com.dohwa.link.repository.CommentRepository;
import com.dohwa.link.repository.ConcertRepository;
import com.dohwa.link.repository.EventRepository;
import com.dohwa.link.repository.FanPostRepository;
import com.dohwa.link.repository.MemberRepository;
import com.dohwa.link.repository.NoticeRepository;
import com.dohwa.link.repository.PostLikeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {
    private static final int FAN_POST_TARGET_COUNT = 100;
    private static final String DEFAULT_PASSWORD = "Dohwa1234!";
    private static final String FAN_EMAIL = "fan@dohwa.com";
    private static final String ADMIN_EMAIL = "admin@dohwa.com";
    private static final String OLD_DOHWA_EMAIL = "dohwa@gmail.com";
    private static final String DOHWA_EMAIL = "dohwa0412@dohwa.com";
    private static final String ARTIST_DISPLAY_NAME = "도화";

    private static final String[] BOARDS = {"Review", "Question", "Fan Art", "Archive", "Trade", "Event"};
    private static final String[] PREFIXES = {"Concert", "Ticket", "Goods", "Image", "Schedule", "Trade", "Event"};
    private static final String[] TITLE_TOPICS = {
            "Blooming Day 예매 준비", "공개방송 참여 후기",
            "도화 굿즈 언박싱", "팬아트 공유",
            "공식 스케줄 정리", "좌석 추천 질문",
            "현장 동선 팁", "응원 문구 아이디어",
            "앨범 교환 안내", "라이브 방송 감상",
            "팬콘 준비물 체크", "포토카드 교환",
            "리허설 초대 기대", "도화 무대 의상",
            "팬클럽 인증 도움말", "신곡 감상 후기",
            "굿즈 현장 판매", "채팅방 이용 후기",
            "이벤트 응모 인증", "첫 콘서트 설렘"
    };
    private static final String[] CONTENTS = {
            "오늘 확인한 내용을 정리했습니다. 처음 참여하는 팬들도 참고하기 좋을 것 같아요.",
            "현장 분위기가 따뜻했고 진행도 깔끔했습니다. 다음 일정도 기대됩니다.",
            "사진과 후기를 같이 남겨 봅니다. 궁금한 점은 댓글로 편하게 물어봐 주세요.",
            "예매 전 확인하면 좋은 정보와 개인적인 팁을 함께 적었습니다.",
            "도화의 무대와 팬들의 응원이 잘 어울렸던 순간을 기록합니다.",
            "같이 준비하면 좋을 체크리스트를 적어 봤습니다. 빠진 내용이 있으면 알려 주세요.",
            "공식 안내를 기준으로 정리했고, 실제 현장 상황에 따라 달라질 수 있습니다.",
            "팬들과 함께 이야기 나누고 싶어서 게시글로 남깁니다. 서로 배려하면서 이용해요."
    };
    private static final String[] TITLE_PERIODS = {
            "6월", "이번 주", "팬콘 전", "예매 전",
            "공방 후", "주말", "오늘", "다음 일정"
    };

    private final MemberRepository memberRepository;
    private final ArtistRepository artistRepository;
    private final ConcertRepository concertRepository;
    private final FanPostRepository fanPostRepository;
    private final CommentRepository commentRepository;
    private final CommentLikeRepository commentLikeRepository;
    private final PostLikeRepository postLikeRepository;
    private final NoticeRepository noticeRepository;
    private final EventRepository eventRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        normalizeExistingMembers();
        seedDefaultMembers();
        normalizeExistingMembers();
        seedPublicData();
        removeBrokenSeedPosts();
        seedFanBoardPosts();
    }

    private void seedDefaultMembers() {
        seedMemberIfMissing(FAN_EMAIL, "피치핏", Role.FAN);
        seedMemberIfMissing(ADMIN_EMAIL, "도화스태프", Role.ADMIN);
        seedMemberIfMissing(DOHWA_EMAIL, ARTIST_DISPLAY_NAME, Role.FAN);
    }

    private void seedMemberIfMissing(String email, String nickname, Role role) {
        if (memberRepository.findByEmail(email).isPresent()) {
            return;
        }
        memberRepository.save(Member.seed(email, passwordEncoder.encode(DEFAULT_PASSWORD), nickname, role, LocalDateTime.now()));
    }

    private void normalizeExistingMembers() {
        migrateDohwaEmail();
        memberRepository.findByEmail(ADMIN_EMAIL).ifPresent(member -> member.changeRole(Role.ADMIN));
        memberRepository.findByEmail(DOHWA_EMAIL).ifPresent(member -> member.changeRole(Role.FAN));
    }

    private void migrateDohwaEmail() {
        memberRepository.findByEmail(OLD_DOHWA_EMAIL).ifPresent(oldMember ->
                memberRepository.findByEmail(DOHWA_EMAIL).ifPresentOrElse(newMember -> {
                    newMember.changeRole(Role.FAN);
                }, () -> oldMember.setEmail(DOHWA_EMAIL)));
    }

    private void seedPublicData() {
        upsertArtist(ARTIST_DISPLAY_NAME,
                "도화는 맑고 따뜻한 감성의 음악과 퍼포먼스로 팬들과 소통하는 솔로 아티스트입니다.",
                "/images/dohwa-profile.png");

        upsertConcert("DOHWA 1st Fan Concert: Blooming Day", LocalDateTime.of(2026, 8, 15, 18, 0),
                "블루밍홀",
                "도화의 첫 번째 팬 콘서트입니다. 신곡 무대, 토크, Q&A가 함께 진행됩니다.",
                100);
        upsertConcert("DOHWA Peach Hour Live", LocalDateTime.of(2026, 9, 12, 19, 30),
                "피치돔",
                "도화의 라이브와 비하인드 토크를 가까이에서 만나는 미니 공연입니다.",
                50);

        upsertNotice("공식 팬클럽 선예매 인증 안내",
                "마이페이지에서 팬클럽 인증 상태를 확인해 주세요.",
                LocalDateTime.now().minusDays(1));
        upsertNotice("거래 게시판 이용 안내",
                "공식 굿즈와 앨범 거래는 정가 양도만 허용됩니다.",
                LocalDateTime.now());

        upsertEvent("도화 사인 앨범 응모",
                "앨범 구매 인증 회원을 대상으로 진행되는 사인 앨범 응모 이벤트입니다.",
                LocalDateTime.of(2026, 6, 10, 0, 0), LocalDateTime.of(2026, 6, 20, 23, 59));
        upsertEvent("Blooming Day 리허설 초대",
                "팬 콘서트 예매자 중 추첨을 통해 리허설 현장에 초대합니다.",
                LocalDateTime.of(2026, 7, 3, 0, 0), LocalDateTime.of(2026, 7, 20, 23, 59));
    }

    private void upsertArtist(String name, String description, String profileImage) {
        Artist artist = artistRepository.findFirstByName(name)
                .or(() -> artistRepository.findAll().stream().findFirst())
                .orElseGet(Artist::new);
        artist.setName(name);
        artist.setDescription(description);
        artist.setProfileImage(profileImage);
        artistRepository.save(artist);
    }

    private void upsertConcert(String title, LocalDateTime concertDate, String venue, String description, int totalSeats) {
        Concert concert = concertRepository.findFirstByTitle(title).orElseGet(Concert::new);
        int soldSeats = Math.max(0, concert.getTotalSeats() - concert.getRemainingSeats());
        concert.setTitle(title);
        concert.setConcertDate(concertDate);
        concert.setVenue(venue);
        concert.setDescription(description);
        concert.setTotalSeats(totalSeats);
        concert.setRemainingSeats(Math.max(0, totalSeats - soldSeats));
        if (concert.getBookingStartAt() == null) {
            concert.setBookingStartAt(concertDate.minusDays(60));
        }
        if (concert.getBookingEndAt() == null) {
            concert.setBookingEndAt(concertDate.minusDays(1));
        }
        if (concert.getVipPrice() <= 0) {
            concert.setVipPrice(154000);
        }
        if (concert.getRPrice() <= 0) {
            concert.setRPrice(132000);
        }
        if (concert.getSPrice() <= 0) {
            concert.setSPrice(110000);
        }
        if (concert.getAPrice() <= 0) {
            concert.setAPrice(88000);
        }
        concertRepository.save(concert);
    }

    private void upsertNotice(String title, String content, LocalDateTime createdAt) {
        Notice notice = noticeRepository.findFirstByTitle(title).orElseGet(Notice::new);
        notice.setTitle(title);
        notice.setContent(content);
        if (notice.getCreatedAt() == null) {
            notice.setCreatedAt(createdAt);
        }
        noticeRepository.save(notice);
    }

    private void upsertEvent(String title, String content, LocalDateTime startAt, LocalDateTime endAt) {
        Event event = eventRepository.findFirstByTitle(title).orElseGet(Event::new);
        event.setTitle(title);
        event.setContent(content);
        event.setStartAt(startAt);
        event.setEndAt(endAt);
        eventRepository.save(event);
    }

    private void removeBrokenSeedPosts() {
        fanPostRepository.findAll().stream()
                .filter(this::isBrokenSeedPost)
                .toList()
                .forEach(this::deletePostCompletely);
    }

    private boolean isBrokenSeedPost(FanPost post) {
        String title = post.getTitle() == null ? "" : post.getTitle();
        String content = post.getContent() == null ? "" : post.getContent();
        return title.contains("샘플")
                || content.contains("샘플")
                || title.contains("Ã")
                || title.contains("ì")
                || title.contains("�")
                || content.contains("Ã")
                || content.contains("ì")
                || content.contains("�");
    }

    private void deletePostCompletely(FanPost post) {
        List<Comment> comments = commentRepository.findByPostOrderByCreatedAtAsc(post);
        comments.forEach(this::deleteCommentLikes);
        postLikeRepository.deleteByPost(post);
        commentRepository.deleteByPost(post);
        fanPostRepository.delete(post);
    }

    private void deleteCommentLikes(Comment comment) {
        comment.getReplies().forEach(this::deleteCommentLikes);
        commentLikeRepository.deleteByComment(comment);
    }

    private void seedFanBoardPosts() {
        Member fan = memberRepository.findByEmail(FAN_EMAIL).orElse(null);
        Member admin = memberRepository.findByEmail(ADMIN_EMAIL).orElse(null);
        if (fan == null || admin == null) {
            return;
        }

        savePostIfMissing(admin, "Notice", "Ticket", "Blooming Day 예매 확인 사항",
                "예매 전 회원 정보와 팬클럽 인증 상태를 확인해 주세요.",
                210, 34, true, LocalDateTime.now().minusDays(2));

        int sequence = 1;
        while (fanPostRepository.count() < FAN_POST_TARGET_COUNT && sequence <= FAN_POST_TARGET_COUNT * 3) {
            Member author = sequence % 5 == 0 ? admin : fan;
            String boardType = BOARDS[sequence % BOARDS.length];
            String prefix = PREFIXES[sequence % PREFIXES.length];
            String title = buildTitle(sequence);
            String content = buildContent(sequence);
            int viewCount = 20 + sequence * 3;
            int likeCount = sequence % 17;
            LocalDateTime createdAt = LocalDateTime.now().minusHours(sequence + 1L);
            savePostIfMissing(author, boardType, prefix, title, content, viewCount, likeCount, false, createdAt);
            sequence++;
        }
    }

    private String buildTitle(int sequence) {
        String period = TITLE_PERIODS[sequence % TITLE_PERIODS.length];
        String topic = TITLE_TOPICS[sequence % TITLE_TOPICS.length];
        String ending = switch (sequence % 6) {
            case 0 -> "같이 확인해요";
            case 1 -> "정리해 봤어요";
            case 2 -> "궁금한 점 있어요";
            case 3 -> "후기 남깁니다";
            case 4 -> "정보 공유합니다";
            default -> "참여 전 체크";
        };
        return period + " " + topic + " " + ending;
    }

    private String buildContent(int sequence) {
        String base = CONTENTS[sequence % CONTENTS.length];
        String detail = switch (sequence % 5) {
            case 0 -> "시간 여유를 두고 움직이면 더 편하게 참여할 수 있을 것 같습니다.";
            case 1 -> "처음 보는 분들도 이해하기 쉽게 필요한 내용만 모았습니다.";
            case 2 -> "댓글로 다른 의견을 남겨 주시면 본문도 계속 보완해 보겠습니다.";
            case 3 -> "공식 안내가 올라오면 다시 확인해서 업데이트하면 좋겠습니다.";
            default -> "서로 필요한 정보를 나누면서 편하게 이용했으면 합니다.";
        };
        return base + "\n\n" + detail;
    }

    private void savePostIfMissing(Member author, String boardType, String prefix, String title, String content,
                                   int viewCount, int likeCount, boolean pinned, LocalDateTime createdAt) {
        if (fanPostRepository.existsByTitle(title)) {
            return;
        }
        fanPostRepository.save(FanPost.seed(author, boardType, prefix, title, content, viewCount, likeCount, pinned, createdAt));
    }
}
