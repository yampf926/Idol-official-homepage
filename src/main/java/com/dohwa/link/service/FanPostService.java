package com.dohwa.link.service;

import com.dohwa.link.domain.Comment;
import com.dohwa.link.domain.CommentLike;
import com.dohwa.link.domain.FanPost;
import com.dohwa.link.domain.Member;
import com.dohwa.link.domain.PostLike;
import com.dohwa.link.domain.Role;
import com.dohwa.link.dto.CommentRequest;
import com.dohwa.link.dto.FanPostRequest;
import com.dohwa.link.repository.CommentLikeRepository;
import com.dohwa.link.repository.CommentRepository;
import com.dohwa.link.repository.FanPostRepository;
import com.dohwa.link.repository.PostLikeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FanPostService {
    private final FanPostRepository fanPostRepository;
    private final CommentRepository commentRepository;
    private final PostLikeRepository postLikeRepository;
    private final CommentLikeRepository commentLikeRepository;
    private final CurrentMemberProvider currentMemberProvider;

    public List<FanPost> findAll() {
        return fanPostRepository.findAllByOrderByPinnedDescIdDesc();
    }

    @Transactional
    public FanPost findById(Long id) {
        return findById(id, true);
    }

    @Transactional
    public FanPost findById(Long id, boolean countView) {
        FanPost post = findPost(id);
        if (countView) {
            post.setViewCount(post.getViewCount() + 1);
        }
        return post;
    }

    @Transactional
    public FanPost create(FanPostRequest request, Long memberId) {
        Member member = currentMemberProvider.get(memberId);
        return fanPostRepository.save(FanPost.builder()
                .author(member)
                .boardType(clean(request.boardType()))
                .prefix(clean(request.prefix()))
                .title(clean(request.title()))
                .content(clean(request.content()))
                .imageUrl(cleanOptional(request.imageUrl()))
                .viewCount(0)
                .likeCount(0)
                .pinned(false)
                .createdAt(LocalDateTime.now())
                .build());
    }

    @Transactional
    public FanPost update(Long id, FanPostRequest request, Long memberId) {
        FanPost post = findPost(id);
        assertAuthor(post, memberId, "작성자만 수정할 수 있습니다.");
        post.setBoardType(clean(request.boardType()));
        post.setPrefix(clean(request.prefix()));
        post.setTitle(clean(request.title()));
        post.setContent(clean(request.content()));
        post.setImageUrl(cleanOptional(request.imageUrl()));
        post.setUpdatedAt(LocalDateTime.now());
        return post;
    }

    @Transactional
    public void delete(Long id, Long memberId) {
        FanPost post = findPost(id);
        assertAuthorOrAdmin(post, memberId, "작성자 또는 관리자만 삭제할 수 있습니다.");
        comments(post).forEach(this::deleteCommentLikes);
        postLikeRepository.deleteByPost(post);
        commentRepository.deleteByPost(post);
        fanPostRepository.delete(post);
    }

    @Transactional
    public Comment comment(Long postId, CommentRequest request, Long memberId) {
        FanPost post = findPost(postId);
        Comment parent = null;
        if (request.parentId() != null) {
            parent = findComment(request.parentId());
            if (!parent.getPost().getId().equals(post.getId())) {
                throw new IllegalArgumentException("같은 게시글의 댓글에만 답글을 달 수 있습니다.");
            }
        }
        return commentRepository.save(Comment.builder()
                .post(post)
                .author(currentMemberProvider.get(memberId))
                .parent(parent)
                .content(clean(request.content()))
                .likeCount(0)
                .createdAt(LocalDateTime.now())
                .build());
    }

    @Transactional
    public Comment updateComment(Long commentId, CommentRequest request, Long memberId) {
        Comment comment = findComment(commentId);
        assertCommentAuthor(comment, memberId, "작성자만 수정할 수 있습니다.");
        comment.setContent(clean(request.content()));
        return comment;
    }

    @Transactional
    public void deleteComment(Long commentId, Long memberId) {
        Comment comment = findComment(commentId);
        assertCommentAuthorOrAdmin(comment, memberId, "작성자 또는 관리자만 삭제할 수 있습니다.");
        deleteCommentLikes(comment);
        commentRepository.delete(comment);
    }

    @Transactional
    public FanPost togglePostLike(Long postId, Long memberId) {
        FanPost post = findPost(postId);
        Member member = currentMemberProvider.get(memberId);
        postLikeRepository.findByPostAndMember(post, member).ifPresentOrElse(existing -> {
            postLikeRepository.delete(existing);
            post.setLikeCount(Math.max(0, post.getLikeCount() - 1));
        }, () -> {
            postLikeRepository.save(PostLike.builder().post(post).member(member).build());
            post.setLikeCount(post.getLikeCount() + 1);
        });
        return post;
    }

    @Transactional
    public Comment toggleCommentLike(Long commentId, Long memberId) {
        Comment comment = findComment(commentId);
        Member member = currentMemberProvider.get(memberId);
        commentLikeRepository.findByCommentAndMember(comment, member).ifPresentOrElse(existing -> {
            commentLikeRepository.delete(existing);
            comment.setLikeCount(Math.max(0, comment.getLikeCount() - 1));
        }, () -> {
            commentLikeRepository.save(CommentLike.builder().comment(comment).member(member).build());
            comment.setLikeCount(comment.getLikeCount() + 1);
        });
        return comment;
    }

    public List<Comment> comments(FanPost post) {
        return commentRepository.findByPostAndParentIsNullOrderByCreatedAtAsc(post);
    }

    public long commentCount(FanPost post) {
        return commentRepository.countByPost(post);
    }

    public boolean likedPost(FanPost post, Long memberId) {
        if (memberId == null) {
            return false;
        }
        return postLikeRepository.existsByPostAndMember(post, currentMemberProvider.get(memberId));
    }

    public boolean likedComment(Comment comment, Long memberId) {
        if (memberId == null) {
            return false;
        }
        return commentLikeRepository.existsByCommentAndMember(comment, currentMemberProvider.get(memberId));
    }

    private FanPost findPost(Long id) {
        return fanPostRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));
    }

    private Comment findComment(Long id) {
        return commentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다."));
    }

    private void assertAuthor(FanPost post, Long memberId, String message) {
        Member member = currentMemberProvider.get(memberId);
        if (!post.getAuthor().getId().equals(member.getId())) {
            throw new IllegalArgumentException(message);
        }
    }

    private void assertAuthorOrAdmin(FanPost post, Long memberId, String message) {
        Member member = currentMemberProvider.get(memberId);
        if (member.getRole() == Role.ADMIN || post.getAuthor().getId().equals(member.getId())) {
            return;
        }
        throw new IllegalArgumentException(message);
    }

    private void assertCommentAuthor(Comment comment, Long memberId, String message) {
        Member member = currentMemberProvider.get(memberId);
        if (!comment.getAuthor().getId().equals(member.getId())) {
            throw new IllegalArgumentException(message);
        }
    }

    private void assertCommentAuthorOrAdmin(Comment comment, Long memberId, String message) {
        Member member = currentMemberProvider.get(memberId);
        if (member.getRole() == Role.ADMIN || comment.getAuthor().getId().equals(member.getId())) {
            return;
        }
        throw new IllegalArgumentException(message);
    }

    private void deleteCommentLikes(Comment comment) {
        comment.getReplies().forEach(this::deleteCommentLikes);
        commentLikeRepository.deleteByComment(comment);
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private String cleanOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
