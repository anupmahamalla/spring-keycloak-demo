package com.example.platform.service.service;

import com.example.platform.service.dto.CategoryRequest;
import com.example.platform.service.dto.CategoryResponse;
import com.example.platform.service.entity.Category;
import com.example.platform.service.exception.ResourceNotFoundException;
import com.example.platform.service.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CategoryService {

    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "categories", key = "'all'")
    public List<CategoryResponse> findAll() {
        log.debug("CACHE MISS [categories:all] — fetching all categories from database");
        return categoryRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "categoryById", key = "#id")
    public CategoryResponse findById(Long id) {
        log.debug("CACHE MISS [categoryById:{}] — fetching category from database", id);
        return toResponse(getEntity(id));
    }

    @Caching(
            put = @CachePut(cacheNames = "categoryById", key = "#result.id"),
            evict = {
                    @CacheEvict(cacheNames = "categories", key = "'all'"),
                    @CacheEvict(cacheNames = "items", key = "'all'"),
                    @CacheEvict(cacheNames = "itemById", allEntries = true)
            }
    )
    public CategoryResponse create(CategoryRequest request) {
        log.debug("CACHE PUT [categoryById] + EVICT [categories, items, itemById] — creating category");
        Category category = new Category();
        category.setName(request.name());
        category.setDescription(request.description());
        return toResponse(categoryRepository.save(category));
    }

    @Caching(
            put = @CachePut(cacheNames = "categoryById", key = "#result.id"),
            evict = {
                    @CacheEvict(cacheNames = "categories", key = "'all'"),
                    @CacheEvict(cacheNames = "items", key = "'all'"),
                    @CacheEvict(cacheNames = "itemById", allEntries = true)
            }
    )
    public CategoryResponse update(Long id, CategoryRequest request) {
        log.debug("CACHE PUT [categoryById:{}] + EVICT [categories, items, itemById] — updating category", id);
        Category category = getEntity(id);
        category.setName(request.name());
        category.setDescription(request.description());
        return toResponse(categoryRepository.save(category));
    }

    @Caching(evict = {
            @CacheEvict(cacheNames = "categoryById", key = "#id"),
            @CacheEvict(cacheNames = "categories", key = "'all'"),
            @CacheEvict(cacheNames = "items", key = "'all'"),
            @CacheEvict(cacheNames = "itemById", allEntries = true)
    })
    public void delete(Long id) {
        log.debug("CACHE EVICT [categoryById:{}, categories, items, itemById] — deleting category", id);
        Category category = getEntity(id);
        categoryRepository.delete(category);
    }

    public Category getEntity(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));
    }

    private CategoryResponse toResponse(Category category) {
        return new CategoryResponse(category.getId(), category.getName(), category.getDescription());
    }
}
