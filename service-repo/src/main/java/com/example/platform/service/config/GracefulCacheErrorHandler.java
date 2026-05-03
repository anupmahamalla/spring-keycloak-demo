package com.example.platform.service.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.interceptor.CacheErrorHandler;

/**
 * Graceful cache error handler that logs cache failures
 * and lets the application fall through to the database.
 * <p>
 * When Redis is down or unreachable, read operations proceed
 * as cache misses and write operations are silently skipped.
 */
@Slf4j
public class GracefulCacheErrorHandler implements CacheErrorHandler {

    @Override
    public void handleCacheGetError(RuntimeException exception, Cache cache, Object key) {
        log.warn("Cache GET failed [cache={}, key={}]: {}. Falling back to database.",
                cache.getName(), key, exception.getMessage());
    }

    @Override
    public void handleCachePutError(RuntimeException exception, Cache cache, Object key, Object value) {
        log.warn("Cache PUT failed [cache={}, key={}]: {}. Skipping cache write.",
                cache.getName(), key, exception.getMessage());
    }

    @Override
    public void handleCacheEvictError(RuntimeException exception, Cache cache, Object key) {
        log.warn("Cache EVICT failed [cache={}, key={}]: {}. Skipping cache eviction.",
                cache.getName(), key, exception.getMessage());
    }

    @Override
    public void handleCacheClearError(RuntimeException exception, Cache cache) {
        log.warn("Cache CLEAR failed [cache={}]: {}. Skipping cache clear.",
                cache.getName(), exception.getMessage());
    }
}

