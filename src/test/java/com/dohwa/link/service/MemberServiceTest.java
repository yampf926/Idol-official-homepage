package com.dohwa.link.service;

import com.dohwa.link.domain.Member;
import com.dohwa.link.domain.Role;
import com.dohwa.link.dto.LoginRequest;
import com.dohwa.link.dto.SignupRequest;
import com.dohwa.link.repository.CommentRepository;
import com.dohwa.link.repository.ChatMessageRepository;
import com.dohwa.link.repository.CommentLikeRepository;
import com.dohwa.link.repository.EventApplyRepository;
import com.dohwa.link.repository.FanPostRepository;
import com.dohwa.link.repository.MemberRepository;
import com.dohwa.link.repository.NotificationRepository;
import com.dohwa.link.repository.PostLikeRepository;
import com.dohwa.link.repository.ReservationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MemberServiceTest {
    @Mock
    private MemberRepository memberRepository;
    @Mock
    private FanPostRepository fanPostRepository;
    @Mock
    private CommentRepository commentRepository;
    @Mock
    private CommentLikeRepository commentLikeRepository;
    @Mock
    private PostLikeRepository postLikeRepository;
    @Mock
    private ReservationRepository reservationRepository;
    @Mock
    private EventApplyRepository eventApplyRepository;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private ChatMessageRepository chatMessageRepository;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Test
    void signupStoresEncodedPassword() {
        MemberService service = service();
        when(memberRepository.findByEmail("new@dohwa.com")).thenReturn(Optional.empty());
        when(memberRepository.save(any(Member.class))).thenAnswer(invocation -> {
            Member member = invocation.getArgument(0);
            member.setId(10L);
            return member;
        });

        service.signup(new SignupRequest("new@dohwa.com", "새팬", "Dohwa1234!"));

        ArgumentCaptor<Member> captor = ArgumentCaptor.forClass(Member.class);
        verify(memberRepository).save(captor.capture());
        Member saved = captor.getValue();
        assertThat(saved.getPassword()).isNotEqualTo("Dohwa1234!");
        assertThat(passwordEncoder.matches("Dohwa1234!", saved.getPassword())).isTrue();
    }

    @Test
    void loginAcceptsAndUpgradesLegacyPlainPassword() {
        MemberService service = service();
        Member member = Member.builder()
                .id(1L)
                .email("fan@dohwa.com")
                .password("1234")
                .nickname("김피치")
                .role(Role.FAN)
                .createdAt(LocalDateTime.now())
                .build();
        when(memberRepository.findByEmail("fan@dohwa.com")).thenReturn(Optional.of(member));

        service.login(new LoginRequest("fan@dohwa.com", "1234"));

        assertThat(member.getPassword()).isNotEqualTo("1234");
        assertThat(passwordEncoder.matches("1234", member.getPassword())).isTrue();
    }

    private MemberService service() {
        return new MemberService(
                memberRepository,
                fanPostRepository,
                commentRepository,
                commentLikeRepository,
                postLikeRepository,
                reservationRepository,
                eventApplyRepository,
                notificationRepository,
                chatMessageRepository,
                passwordEncoder
        );
    }
}
