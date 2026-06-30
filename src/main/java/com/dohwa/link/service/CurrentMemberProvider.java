package com.dohwa.link.service;

import com.dohwa.link.domain.Member;
import com.dohwa.link.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CurrentMemberProvider {
    private final MemberRepository memberRepository;

    public Member get(Long memberId) {
        Long id = memberId == null ? 1L : memberId;
        return memberRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));
    }
}
