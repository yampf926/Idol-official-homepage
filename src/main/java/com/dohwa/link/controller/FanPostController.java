package com.dohwa.link.controller;

import com.dohwa.link.domain.Comment;
import com.dohwa.link.domain.FanPost;
import com.dohwa.link.dto.ApiMessage;
import com.dohwa.link.dto.CommentRequest;
import com.dohwa.link.dto.FanPostRequest;
import com.dohwa.link.service.FanPostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Transactional
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:412", "http://127.0.0.1:412", "http://localhost:0412", "http://127.0.0.1:0412"})
public class FanPostController {
    private final FanPostService fanPostService;

    @GetMapping("/api/fan-posts")
    public List<Map<String, Object>> posts(@RequestParam(required = false) Long memberId) {
        return fanPostService.findAll().stream().map(post -> summary(post, memberId)).toList();
    }

    @GetMapping("/api/fan-posts/{postId}")
    public Map<String, Object> post(@PathVariable Long postId, @RequestParam(required = false) Long memberId, @RequestParam(defaultValue = "true") boolean countView) {
        FanPost post = fanPostService.findById(postId, countView);
        return detail(post, memberId);
    }

    @PostMapping("/api/fan-posts")
    public Map<String, Object> create(@Valid @RequestBody FanPostRequest request, @RequestParam(defaultValue = "1") Long memberId) {
        return detail(fanPostService.create(request, memberId), memberId);
    }

    @PutMapping("/api/fan-posts/{postId}")
    public Map<String, Object> update(@PathVariable Long postId, @Valid @RequestBody FanPostRequest request, @RequestParam(defaultValue = "1") Long memberId) {
        return detail(fanPostService.update(postId, request, memberId), memberId);
    }

    @DeleteMapping("/api/fan-posts/{postId}")
    public ApiMessage delete(@PathVariable Long postId, @RequestParam(defaultValue = "1") Long memberId) {
        fanPostService.delete(postId, memberId);
        return new ApiMessage("寃뚯떆湲????젣?섏뿀?듬땲??");
    }

    @PostMapping("/api/fan-posts/{postId}/like")
    public Map<String, Object> like(@PathVariable Long postId, @RequestParam(defaultValue = "1") Long memberId) {
        return summary(fanPostService.togglePostLike(postId, memberId), memberId);
    }

    @PostMapping("/api/fan-posts/{postId}/comments")
    public Map<String, Object> comment(@PathVariable Long postId, @Valid @RequestBody CommentRequest request, @RequestParam(defaultValue = "1") Long memberId) {
        return commentResponse(fanPostService.comment(postId, request, memberId), memberId);
    }

    @PutMapping("/api/comments/{commentId}")
    public Map<String, Object> updateComment(@PathVariable Long commentId, @Valid @RequestBody CommentRequest request, @RequestParam(defaultValue = "1") Long memberId) {
        return commentResponse(fanPostService.updateComment(commentId, request, memberId), memberId);
    }

    @PostMapping("/api/comments/{commentId}/like")
    public Map<String, Object> likeComment(@PathVariable Long commentId, @RequestParam(defaultValue = "1") Long memberId) {
        return commentResponse(fanPostService.toggleCommentLike(commentId, memberId), memberId);
    }

    @DeleteMapping("/api/comments/{commentId}")
    public ApiMessage deleteComment(@PathVariable Long commentId, @RequestParam(defaultValue = "1") Long memberId) {
        fanPostService.deleteComment(commentId, memberId);
        return new ApiMessage("?볤?????젣?섏뿀?듬땲??");
    }

    private Map<String, Object> summary(FanPost post, Long memberId) {
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
                Map.entry("liked", fanPostService.likedPost(post, memberId)),
                Map.entry("pinned", post.isPinned()),
                Map.entry("createdAt", post.getCreatedAt()),
                Map.entry("commentCount", fanPostService.commentCount(post))
        );
    }

    private Map<String, Object> detail(FanPost post, Long memberId) {
        return Map.of(
                "post", summary(post, memberId),
                "content", post.getContent(),
                "imageUrl", post.getImageUrl() == null ? "" : post.getImageUrl(),
                "comments", fanPostService.comments(post).stream().map(comment -> commentResponse(comment, memberId)).toList()
        );
    }

    private Map<String, Object> commentResponse(Comment comment, Long memberId) {
        return Map.of(
                "id", comment.getId(),
                "authorId", comment.getAuthor().getId(),
                "authorNickname", comment.getAuthor().getNickname(),
                "content", comment.getContent(),
                "likeCount", comment.getLikeCount(),
                "liked", fanPostService.likedComment(comment, memberId),
                "createdAt", comment.getCreatedAt(),
                "replies", comment.getReplies().stream().map(reply -> commentResponse(reply, memberId)).toList()
        );
    }
}
