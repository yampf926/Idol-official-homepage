package com.dohwa.link.controller;

import com.dohwa.link.dto.ChatMessageRequest;
import com.dohwa.link.dto.ApiMessage;
import com.dohwa.link.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:412", "http://127.0.0.1:412", "http://localhost:0412", "http://127.0.0.1:0412"})
public class ChatController {
    private final ChatService chatService;

    @GetMapping("/messages")
    public List<Map<String, Object>> messages() {
        return chatService.messages();
    }

    @PostMapping("/messages")
    public Map<String, Object> send(@Valid @RequestBody ChatMessageRequest request, @RequestParam Long memberId) {
        return chatService.send(memberId, request);
    }

    @DeleteMapping("/messages/{messageId}")
    public ApiMessage delete(@PathVariable Long messageId, @RequestParam Long memberId) {
        chatService.delete(messageId, memberId);
        return new ApiMessage("梨꾪똿????젣?섏뿀?듬땲??");
    }
}
