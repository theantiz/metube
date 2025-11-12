package com.antiz.metube.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;

@Slf4j
@Configuration
public class RedisHealthCheck {

    @Autowired
    private RedisConnectionFactory redisConnectionFactory;

    @PostConstruct
    public void checkRedisConnection() {
        try (RedisConnection connection = redisConnectionFactory.getConnection()) {
            String pong = connection.ping();
            if ("PONG".equalsIgnoreCase(pong)) {
                log.info("✅ Connected to Upstash Redis successfully (PING: PONG)");
            } else {
                log.warn("⚠️ Unexpected Redis response: {}", pong);
            }
        } catch (Exception e) {
            log.error("❌ Failed to connect to Redis: {}", e.getMessage());
        }
    }
}
