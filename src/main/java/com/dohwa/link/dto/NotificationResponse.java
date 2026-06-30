package com.dohwa.link.dto;

import com.dohwa.link.domain.Notification;

import java.time.LocalDateTime;

public record NotificationResponse(
        Long id,
        String content,
        boolean read,
        LocalDateTime createdAt
) {
    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getContent(),
                notification.isRead(),
                notification.getCreatedAt()
        );
    }
}
