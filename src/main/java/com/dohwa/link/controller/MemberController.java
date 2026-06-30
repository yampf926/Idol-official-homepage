package com.dohwa.link.controller;

import com.dohwa.link.dto.ApiMessage;
import com.dohwa.link.dto.DeleteAccountRequest;
import com.dohwa.link.dto.FindEmailRequest;
import com.dohwa.link.dto.LoginRequest;
import com.dohwa.link.dto.MemberUpdateRequest;
import com.dohwa.link.dto.PasswordChangeRequest;
import com.dohwa.link.dto.PasswordResetRequest;
import com.dohwa.link.dto.SignupRequest;
import com.dohwa.link.service.MemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/members")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:412", "http://127.0.0.1:412", "http://localhost:0412", "http://127.0.0.1:0412"})
public class MemberController {
    private final MemberService memberService;

    @PostMapping("/signup")
    public Map<String, Object> signup(@Valid @RequestBody SignupRequest request) {
        return memberService.signup(request);
    }

    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody LoginRequest request) {
        return memberService.login(request);
    }

    @PostMapping("/find-email")
    public Map<String, Object> findEmail(@Valid @RequestBody FindEmailRequest request) {
        return memberService.findEmail(request);
    }

    @PutMapping("/password/reset")
    public ApiMessage resetPassword(@Valid @RequestBody PasswordResetRequest request) {
        memberService.resetPassword(request);
        return new ApiMessage("鍮꾨?踰덊샇媛 ?ъ꽕?뺣릺?덉뒿?덈떎.");
    }

    @GetMapping("/me")
    public Map<String, Object> me(@RequestParam(defaultValue = "1") Long memberId) {
        return memberService.me(memberId);
    }

    @GetMapping
    public List<Map<String, Object>> members(@RequestParam(required = false) String keyword) {
        return memberService.findByNicknameKeyword(keyword);
    }

    @GetMapping("/{memberId}/profile")
    public Map<String, Object> profile(@PathVariable Long memberId) {
        return memberService.profile(memberId);
    }

    @PutMapping("/{memberId}")
    public Map<String, Object> update(@PathVariable Long memberId, @Valid @RequestBody MemberUpdateRequest request) {
        return memberService.update(memberId, request);
    }

    @PutMapping("/{memberId}/password")
    public ApiMessage changePassword(@PathVariable Long memberId, @Valid @RequestBody PasswordChangeRequest request) {
        memberService.changePassword(memberId, request);
        return new ApiMessage("鍮꾨?踰덊샇媛 蹂寃쎈릺?덉뒿?덈떎.");
    }

    @DeleteMapping("/{memberId}")
    public ApiMessage delete(@PathVariable Long memberId, @Valid @RequestBody DeleteAccountRequest request) {
        memberService.delete(memberId, request);
        return new ApiMessage("?뚯썝?덊눜媛 ?꾨즺?섏뿀?듬땲??");
    }
}
