package com.dohwa.link;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Profile("local")
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
public class LocalSchemaGuard implements ApplicationRunner {
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        jdbcTemplate.execute("ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id BIGINT");
        jdbcTemplate.execute("ALTER TABLE comments ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0 NOT NULL");
        jdbcTemplate.execute("ALTER TABLE members ADD COLUMN IF NOT EXISTS profile_image CLOB");
        jdbcTemplate.execute("ALTER TABLE fan_posts ADD COLUMN IF NOT EXISTS image_url CLOB");
        jdbcTemplate.execute("ALTER TABLE concerts ADD COLUMN IF NOT EXISTS booking_start_at TIMESTAMP");
        jdbcTemplate.execute("ALTER TABLE concerts ADD COLUMN IF NOT EXISTS booking_end_at TIMESTAMP");
        jdbcTemplate.execute("ALTER TABLE concerts ADD COLUMN IF NOT EXISTS vip_price INTEGER DEFAULT 154000 NOT NULL");
        jdbcTemplate.execute("ALTER TABLE concerts ADD COLUMN IF NOT EXISTS r_price INTEGER DEFAULT 132000 NOT NULL");
        jdbcTemplate.execute("ALTER TABLE concerts ADD COLUMN IF NOT EXISTS s_price INTEGER DEFAULT 110000 NOT NULL");
        jdbcTemplate.execute("ALTER TABLE concerts ADD COLUMN IF NOT EXISTS a_price INTEGER DEFAULT 88000 NOT NULL");
        jdbcTemplate.execute("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30)");
        jdbcTemplate.execute("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMP");
        jdbcTemplate.execute("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP");
        jdbcTemplate.execute("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS ticket_code VARCHAR(80)");
        jdbcTemplate.execute("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS seat_grade VARCHAR(20)");
        jdbcTemplate.execute("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 0 NOT NULL");
        jdbcTemplate.execute("ALTER TABLE reservations ALTER COLUMN status VARCHAR(30)");
        jdbcTemplate.execute("""
                UPDATE reservations r
                SET status = 'CANCELED'
                WHERE status IN ('PAYMENT_PENDING', 'RESERVED')
                  AND EXISTS (
                      SELECT 1
                      FROM concerts c
                      WHERE c.id = r.concert_id
                        AND c.booking_start_at IS NOT NULL
                        AND r.reserved_at < c.booking_start_at
                  )
                """);
        jdbcTemplate.execute("CREATE SEQUENCE IF NOT EXISTS SEQ_REPORT START WITH 1 INCREMENT BY 1");
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS reports (
                    id BIGINT PRIMARY KEY,
                    reporter_id BIGINT NOT NULL,
                    target_type VARCHAR(30) NOT NULL,
                    target_id BIGINT NOT NULL,
                    reason VARCHAR(500) NOT NULL,
                    status VARCHAR(30) NOT NULL,
                    created_at TIMESTAMP NOT NULL,
                    resolved_at TIMESTAMP
                )
                """);
        jdbcTemplate.execute("CREATE SEQUENCE IF NOT EXISTS SEQ_POST_LIKE START WITH 1 INCREMENT BY 1");
        jdbcTemplate.execute("CREATE SEQUENCE IF NOT EXISTS SEQ_COMMENT_LIKE START WITH 1 INCREMENT BY 1");
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS post_likes (
                    id BIGINT PRIMARY KEY,
                    post_id BIGINT NOT NULL,
                    member_id BIGINT NOT NULL
                )
                """);
        jdbcTemplate.execute("CREATE UNIQUE INDEX IF NOT EXISTS ux_post_likes_post_member ON post_likes(post_id, member_id)");
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS comment_likes (
                    id BIGINT PRIMARY KEY,
                    comment_id BIGINT NOT NULL,
                    member_id BIGINT NOT NULL
                )
                """);
        jdbcTemplate.execute("CREATE UNIQUE INDEX IF NOT EXISTS ux_comment_likes_comment_member ON comment_likes(comment_id, member_id)");
        restartSequenceAfterMaxId("SEQ_POST_LIKE", "post_likes");
        restartSequenceAfterMaxId("SEQ_COMMENT_LIKE", "comment_likes");
        restartSequenceAfterMaxId("SEQ_REPORT", "reports");
    }

    private void restartSequenceAfterMaxId(String sequenceName, String tableName) {
        Long nextId = jdbcTemplate.queryForObject("SELECT COALESCE(MAX(id), 0) + 1 FROM " + tableName, Long.class);
        jdbcTemplate.execute("ALTER SEQUENCE " + sequenceName + " RESTART WITH " + nextId);
    }
}
