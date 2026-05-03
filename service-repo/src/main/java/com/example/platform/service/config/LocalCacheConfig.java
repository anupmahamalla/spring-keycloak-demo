package com.example.platform.service.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Local (in-memory) cache configuration.
 * Activated when {@code app.cache.provider=local}.
 */
@Slf4j
@Configuration
@ConditionalOnProperty(name = "app.cache.provider", havingValue = "local")
public class LocalCacheConfig implements CachingConfigurer {

    @Bean
    @Override
    public CacheManager cacheManager() {
        log.info("Initializing LOCAL in-memory cache manager");
        return new ConcurrentMapCacheManager("categories", "categoryById", "items", "itemById");
    }

    @Bean
    @Override
    public CacheErrorHandler errorHandler() {
        return new GracefulCacheErrorHandler();
    }
}

