package com.dohwa.link.service;

import com.dohwa.link.domain.FanPost;
import com.dohwa.link.domain.Member;
import com.dohwa.link.domain.Reservation;
import com.dohwa.link.domain.ReservationStatus;
import com.dohwa.link.domain.Role;
import com.dohwa.link.repository.CommentRepository;
import com.dohwa.link.repository.EventApplyRepository;
import com.dohwa.link.repository.FanPostRepository;
import com.dohwa.link.repository.MemberRepository;
import com.dohwa.link.repository.PostLikeRepository;
import com.dohwa.link.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FanDashboardService {
    private final MemberRepository memberRepository;
    private final FanPostRepository fanPostRepository;
    private final CommentRepository commentRepository;
    private final PostLikeRepository postLikeRepository;
    private final ReservationRepository reservationRepository;
    private final EventApplyRepository eventApplyRepository;

    public Map<String, Object> dashboard(Long memberId) {
        List<MemberScore> scores = memberRepository.findAll().stream()
                .map(this::score)
                .sorted(Comparator.comparingInt(MemberScore::points).reversed())
                .toList();

        MemberScore mine = memberId == null ? null : scores.stream()
                .filter(item -> item.member().getId().equals(memberId))
                .findFirst()
                .orElse(null);

        List<Map<String, Object>> ranking = scores.stream()
                .filter(item -> isRankingMember(item.member()))
                .limit(10)
                .map(item -> Map.<String, Object>of(
                        "memberId", item.member().getId(),
                        "nickname", item.member().getNickname(),
                        "level", level(item.points()),
                        "title", title(level(item.points())),
                        "points", item.points(),
                        "postCount", item.postCount(),
                        "commentCount", item.commentCount(),
                        "likedPosts", item.likedPostCount(),
                        "reservationCount", item.reservationCount(),
                        "eventApplyCount", item.eventApplyCount()
                ))
                .toList();

        List<Map<String, Object>> hotPosts = fanPostRepository.findAllByOrderByPinnedDescIdDesc().stream()
                .filter(post -> isRankingMember(post.getAuthor()))
                .sorted(Comparator.comparingInt(this::hotScore).reversed())
                .limit(5)
                .map(post -> Map.<String, Object>of(
                        "id", post.getId(),
                        "title", post.getTitle(),
                        "prefix", post.getPrefix(),
                        "author", post.getAuthor().getNickname(),
                        "likeCount", post.getLikeCount(),
                        "viewCount", post.getViewCount(),
                        "commentCount", commentRepository.countByPost(post)
                ))
                .toList();

        return Map.of(
                "me", mine == null ? Map.of() : memberCard(mine),
                "ranking", ranking,
                "missions", mine == null ? guestMissions() : missions(mine),
                "hotPosts", hotPosts
        );
    }

    private boolean isRankingMember(Member member) {
        if (member.getRole() != Role.FAN) return false;
        String email = member.getEmail().toLowerCase();
        return !email.equals("admin@dohwa.com") && !email.equals("dohwa0412@dohwa.com") && !email.equals("dohwa@gmail.com");
    }

    private MemberScore score(Member member) {
        List<FanPost> posts = fanPostRepository.findByAuthorOrderByIdDesc(member);
        int comments = commentRepository.findByAuthorOrderByCreatedAtDesc(member).size();
        int likedPosts = postLikeRepository.findByMemberOrderByIdDesc(member).size();
        List<Reservation> reservations = reservationRepository.findByMemberOrderByReservedAtDesc(member);
        int activeReservations = (int) reservations.stream().filter(item -> item.getStatus() == ReservationStatus.RESERVED).count();
        int eventApplies = eventApplyRepository.findByMemberOrderByAppliedAtDesc(member).size();
        int receivedLikes = posts.stream().mapToInt(FanPost::getLikeCount).sum();
        int views = posts.stream().mapToInt(FanPost::getViewCount).sum();
        int points = posts.size() * 60
                + comments * 20
                + likedPosts * 10
                + activeReservations * 80
                + eventApplies * 30;
        return new MemberScore(member, points, posts.size(), comments, likedPosts, activeReservations, eventApplies, receivedLikes, views);
    }

    private Map<String, Object> memberCard(MemberScore score) {
        int level = level(score.points());
        int currentFloor = levelFloor(level);
        int nextFloor = levelFloor(level + 1);
        int progress = nextFloor == currentFloor ? 100 : Math.min(100, Math.max(0, (score.points() - currentFloor) * 100 / (nextFloor - currentFloor)));
        return Map.of(
                "memberId", score.member().getId(),
                "nickname", score.member().getNickname(),
                "level", level,
                "title", title(level),
                "points", score.points(),
                "nextLevelPoints", nextFloor,
                "progress", progress,
                "stats", Map.of(
                        "posts", score.postCount(),
                        "comments", score.commentCount(),
                        "likedPosts", score.likedPostCount(),
                        "reservations", score.reservationCount(),
                        "eventApplies", score.eventApplyCount(),
                        "receivedLikes", score.receivedLikes(),
                        "views", score.views()
                ),
                "badges", badges(score)
        );
    }

    private List<Map<String, Object>> missions(MemberScore score) {
        return List.of(
                mission("첫 게시글 작성", "게시글 1개 작성", score.postCount(), 1),
                mission("댓글로 응원하기", "댓글 5개 작성", score.commentCount(), 5),
                mission("마음 보내기", "좋아요한 글 3개 달성", score.likedPostCount(), 3),
                mission("공연 참여", "공연 예매 1건 완료", score.reservationCount(), 1),
                mission("이벤트 참여", "이벤트 응모 1회", score.eventApplyCount(), 1)
        );
    }

    private List<Map<String, Object>> guestMissions() {
        return List.of(
                mission("로그인하기", "로그인하면 나의 팬덤 미션을 확인할 수 있습니다.", 0, 1),
                mission("게시판 둘러보기", "팬들이 남긴 글을 확인해 보세요.", 0, 1),
                mission("공연 확인하기", "예매 가능한 공연을 확인해 보세요.", 0, 1)
        );
    }

    private Map<String, Object> mission(String title, String description, int value, int target) {
        return Map.of("title", title, "description", description, "value", Math.min(value, target), "target", target, "complete", value >= target);
    }

    private List<Map<String, Object>> badges(MemberScore score) {
        Map<String, Boolean> badges = new LinkedHashMap<>();
        badges.put("새싹 피치", score.points() >= 50);
        badges.put("첫 글의 주인공", score.postCount() >= 1);
        badges.put("댓글 요정", score.commentCount() >= 10);
        badges.put("하트 수집가", score.likedPostCount() >= 10);
        badges.put("공연 메이트", score.reservationCount() >= 1);
        badges.put("이벤트 참여자", score.eventApplyCount() >= 1);
        badges.put("피치 대장", score.points() >= 500);
        return badges.entrySet().stream().map(entry -> Map.<String, Object>of("name", entry.getKey(), "earned", entry.getValue())).toList();
    }

    private int hotScore(FanPost post) {
        return post.getLikeCount() * 12 + post.getViewCount() + (int) commentRepository.countByPost(post) * 8;
    }

    private int level(int points) {
        return Math.min(20, Math.max(1, points / 120 + 1));
    }

    private int levelFloor(int level) {
        return Math.max(0, (level - 1) * 120);
    }

    private String title(int level) {
        if (level >= 15) return "피치의 전설";
        if (level >= 10) return "복숭아 정원사";
        if (level >= 6) return "무대 지킴이";
        if (level >= 3) return "피치 메이트";
        return "새싹 피치";
    }

    private record MemberScore(Member member, int points, int postCount, int commentCount, int likedPostCount, int reservationCount, int eventApplyCount, int receivedLikes, int views) {
    }
}
