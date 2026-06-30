package com.dohwa.link.service;

import com.dohwa.link.domain.Comment;
import com.dohwa.link.domain.FanPost;
import com.dohwa.link.domain.Member;
import com.dohwa.link.domain.PostLike;
import com.dohwa.link.domain.Reservation;
import com.dohwa.link.domain.ReservationStatus;
import com.dohwa.link.domain.Role;
import com.dohwa.link.dto.DeleteAccountRequest;
import com.dohwa.link.dto.FindEmailRequest;
import com.dohwa.link.dto.LoginRequest;
import com.dohwa.link.dto.MemberUpdateRequest;
import com.dohwa.link.dto.PasswordChangeRequest;
import com.dohwa.link.dto.PasswordResetRequest;
import com.dohwa.link.dto.SignupRequest;
import com.dohwa.link.repository.ChatMessageRepository;
import com.dohwa.link.repository.CommentLikeRepository;
import com.dohwa.link.repository.CommentRepository;
import com.dohwa.link.repository.EventApplyRepository;
import com.dohwa.link.repository.FanPostRepository;
import com.dohwa.link.repository.MemberRepository;
import com.dohwa.link.repository.NotificationRepository;
import com.dohwa.link.repository.PostLikeRepository;
import com.dohwa.link.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberService {
    private static final String DOHWA_EMAIL = "dohwa0412@dohwa.com";
    private static final String ADMIN_EMAIL = "admin@dohwa.com";

    private final MemberRepository memberRepository;
    private final FanPostRepository fanPostRepository;
    private final CommentRepository commentRepository;
    private final CommentLikeRepository commentLikeRepository;
    private final PostLikeRepository postLikeRepository;
    private final ReservationRepository reservationRepository;
    private final EventApplyRepository eventApplyRepository;
    private final NotificationRepository notificationRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public Map<String, Object> signup(SignupRequest request) {
        memberRepository.findByEmail(request.email()).ifPresent(member -> {
            throw new IllegalArgumentException("이미 가입된 이메일입니다.");
        });
        String nickname = request.nickname().trim();
        if (memberRepository.existsByNicknameAndIdNot(nickname, -1L)) {
            throw new IllegalArgumentException("이미 존재하는 닉네임입니다.");
        }
        Member member = memberRepository.save(Member.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .nickname(nickname)
                .role(Role.FAN)
                .createdAt(LocalDateTime.now())
                .build());
        normalizeSpecialAccount(member);
        return toResponse(member);
    }

    @Transactional
    public void changePassword(Long memberId, PasswordChangeRequest request) {
        Member member = findMember(memberId);
        if (!passwordMatches(request.currentPassword(), member.getPassword())) {
            throw new IllegalArgumentException("현재 비밀번호를 확인해 주세요.");
        }
        member.setPassword(passwordEncoder.encode(request.newPassword()));
    }

    @Transactional
    public Map<String, Object> login(LoginRequest request) {
        Member member = memberRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalArgumentException("이메일 또는 비밀번호를 확인해 주세요."));
        if (!passwordMatches(request.password(), member.getPassword())) {
            throw new IllegalArgumentException("이메일 또는 비밀번호를 확인해 주세요.");
        }
        upgradeLegacyPasswordIfNeeded(member, request.password());
        normalizeSpecialAccount(member);
        return toResponse(member);
    }

    @Transactional
    public Map<String, Object> me(Long memberId) {
        Member member = findMember(memberId == null ? 1L : memberId);
        normalizeSpecialAccount(member);
        return toResponse(member);
    }

    public List<Map<String, Object>> findAll() {
        return findByNicknameKeyword(null);
    }

    public List<Map<String, Object>> findByNicknameKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return List.of();
        }
        return memberRepository.findByNicknameContainingIgnoreCaseOrderByIdDesc(keyword.trim()).stream()
                .map(this::toResponse)
                .toList();
    }

    public Map<String, Object> findEmail(FindEmailRequest request) {
        String nickname = request.nickname().trim();
        List<String> emails = memberRepository.findAll().stream()
                .filter(member -> nickname.equals(member.getNickname()))
                .map(Member::getEmail)
                .map(this::maskEmail)
                .toList();
        if (emails.isEmpty()) {
            throw new IllegalArgumentException("일치하는 계정을 찾을 수 없습니다.");
        }
        return Map.of("emails", emails);
    }

    @Transactional
    public void resetPassword(PasswordResetRequest request) {
        Member member = memberRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalArgumentException("일치하는 계정을 찾을 수 없습니다."));
        if (!request.nickname().trim().equals(member.getNickname())) {
            throw new IllegalArgumentException("이메일과 닉네임이 일치하지 않습니다.");
        }
        member.setPassword(passwordEncoder.encode(request.newPassword()));
    }

    public Map<String, Object> profile(Long memberId) {
        Member member = findMember(memberId);
        return Map.of(
                "member", toResponse(member),
                "posts", fanPostRepository.findByAuthorOrderByIdDesc(member).stream().map(this::postSummary).toList(),
                "comments", commentRepository.findByAuthorOrderByCreatedAtDesc(member).stream().map(this::commentSummary).toList(),
                "likedPosts", postLikeRepository.findByMemberOrderByIdDesc(member).stream().map(PostLike::getPost).map(this::postSummary).toList()
        );
    }

    @Transactional
    public Map<String, Object> update(Long memberId, MemberUpdateRequest request) {
        Member member = findMember(memberId);
        String nickname = request.nickname().trim();
        if (memberRepository.existsByNicknameAndIdNot(nickname, member.getId())) {
            throw new IllegalArgumentException("이미 존재하는 닉네임입니다.");
        }
        member.setNickname(nickname);
        member.setProfileImage(cleanOptional(request.profileImage()));
        if (request.role() != null) {
            member.setRole(request.role());
        }
        normalizeSpecialAccount(member);
        return toResponse(member);
    }

    @Transactional
    public void delete(Long memberId, DeleteAccountRequest request) {
        Member member = findMember(memberId);
        if (request == null || !passwordMatches(request.password(), member.getPassword())) {
            throw new IllegalArgumentException("비밀번호를 확인해 주세요.");
        }
        releaseReservedSeats(member);
        chatMessageRepository.deleteBySender(member);
        notificationRepository.deleteByMember(member);
        eventApplyRepository.deleteByMember(member);
        reservationRepository.deleteByMember(member);
        postLikeRepository.deleteByMember(member);
        commentLikeRepository.deleteByMember(member);
        deleteMemberPosts(member);
        deleteMemberComments(member);
        memberRepository.delete(member);
    }

    private Member findMember(Long memberId) {
        return memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));
    }

    private String maskEmail(String email) {
        int atIndex = email.indexOf('@');
        if (atIndex <= 1) {
            return email;
        }
        String local = email.substring(0, atIndex);
        String domain = email.substring(atIndex);
        int visible = Math.min(2, local.length());
        return local.substring(0, visible) + "***" + domain;
    }

    private void releaseReservedSeats(Member member) {
        reservationRepository.findByMemberOrderByReservedAtDesc(member).stream()
                .filter(reservation -> reservation.getStatus() == ReservationStatus.RESERVED || reservation.getStatus() == ReservationStatus.PAYMENT_PENDING)
                .map(Reservation::getConcert)
                .forEach(concert -> concert.setRemainingSeats(concert.getRemainingSeats() + 1));
    }

    private void deleteMemberPosts(Member member) {
        fanPostRepository.findByAuthorOrderByIdDesc(member).forEach(post -> {
            commentRepository.findByPostOrderByCreatedAtAsc(post).forEach(commentLikeRepository::deleteByComment);
            postLikeRepository.deleteByPost(post);
            commentRepository.deleteByPost(post);
            fanPostRepository.delete(post);
        });
    }

    private void deleteMemberComments(Member member) {
        commentRepository.findByAuthorOrderByCreatedAtDesc(member).forEach(comment -> {
            if (commentRepository.existsById(comment.getId())) {
                deleteCommentLikes(comment);
                commentRepository.delete(comment);
            }
        });
    }

    private void deleteCommentLikes(Comment comment) {
        comment.getReplies().forEach(this::deleteCommentLikes);
        commentLikeRepository.deleteByComment(comment);
    }

    private boolean passwordMatches(String rawPassword, String savedPassword) {
        if (savedPassword == null) {
            return false;
        }
        if (isEncodedPassword(savedPassword)) {
            return passwordEncoder.matches(rawPassword, savedPassword);
        }
        return savedPassword.equals(rawPassword);
    }

    private void upgradeLegacyPasswordIfNeeded(Member member, String rawPassword) {
        String savedPassword = member.getPassword();
        if (savedPassword == null || savedPassword.equals(rawPassword)) {
            member.setPassword(passwordEncoder.encode(rawPassword));
        }
    }

    private boolean isEncodedPassword(String savedPassword) {
        return savedPassword.startsWith("$2a$") || savedPassword.startsWith("$2b$") || savedPassword.startsWith("$2y$");
    }

    private void normalizeSpecialAccount(Member member) {
        if (DOHWA_EMAIL.equalsIgnoreCase(member.getEmail())) {
            member.setRole(Role.FAN);
        }
        if (ADMIN_EMAIL.equalsIgnoreCase(member.getEmail())) {
            member.setRole(Role.ADMIN);
        }
    }

    public Map<String, Object> toResponse(Member member) {
        return Map.of(
                "id", member.getId(),
                "email", member.getEmail(),
                "nickname", member.getNickname(),
                "role", member.getRole(),
                "createdAt", member.getCreatedAt(),
                "profileImage", member.getProfileImage() == null ? "" : member.getProfileImage()
        );
    }

    private Map<String, Object> postSummary(FanPost post) {
        return Map.ofEntries(
                Map.entry("id", post.getId()),
                Map.entry("boardType", post.getBoardType()),
                Map.entry("prefix", post.getPrefix()),
                Map.entry("title", post.getTitle()),
                Map.entry("imageUrl", post.getImageUrl() == null ? "" : post.getImageUrl()),
                Map.entry("authorId", post.getAuthor().getId()),
                Map.entry("author", post.getAuthor().getNickname()),
                Map.entry("viewCount", post.getViewCount()),
                Map.entry("likeCount", post.getLikeCount()),
                Map.entry("pinned", post.isPinned()),
                Map.entry("createdAt", post.getCreatedAt())
        );
    }

    private Map<String, Object> commentSummary(Comment comment) {
        FanPost post = comment.getPost();
        return Map.ofEntries(
                Map.entry("id", comment.getId()),
                Map.entry("content", comment.getContent()),
                Map.entry("likeCount", comment.getLikeCount()),
                Map.entry("createdAt", comment.getCreatedAt()),
                Map.entry("postId", post.getId()),
                Map.entry("postTitle", post.getTitle()),
                Map.entry("postPrefix", post.getPrefix()),
                Map.entry("postImageUrl", post.getImageUrl() == null ? "" : post.getImageUrl())
        );
    }

    private String cleanOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
