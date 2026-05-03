package com.example.platform.service.service;

import com.example.platform.service.dto.ItemRequest;
import com.example.platform.service.dto.ItemResponse;
import com.example.platform.service.entity.Category;
import com.example.platform.service.entity.Item;
import com.example.platform.service.exception.ResourceNotFoundException;
import com.example.platform.service.repository.ItemRepository;
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
public class ItemService {

    private final ItemRepository itemRepository;
    private final CategoryService categoryService;

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "items", key = "'all'")
    public List<ItemResponse> findAll() {
        log.debug("CACHE MISS [items:all] — fetching all items from database");
        return itemRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "itemById", key = "#id")
    public ItemResponse findById(Long id) {
        log.debug("CACHE MISS [itemById:{}] — fetching item from database", id);
        return toResponse(getEntity(id));
    }

    @Caching(
            put = @CachePut(cacheNames = "itemById", key = "#result.id"),
            evict = @CacheEvict(cacheNames = "items", key = "'all'")
    )
    public ItemResponse create(ItemRequest request) {
        log.debug("CACHE PUT [itemById] + EVICT [items] — creating item");
        Item item = new Item();
        apply(item, request);
        return toResponse(itemRepository.save(item));
    }

    @Caching(
            put = @CachePut(cacheNames = "itemById", key = "#result.id"),
            evict = @CacheEvict(cacheNames = "items", key = "'all'")
    )
    public ItemResponse update(Long id, ItemRequest request) {
        log.debug("CACHE PUT [itemById:{}] + EVICT [items] — updating item", id);
        Item item = getEntity(id);
        apply(item, request);
        return toResponse(itemRepository.save(item));
    }

    @Caching(evict = {
            @CacheEvict(cacheNames = "itemById", key = "#id"),
            @CacheEvict(cacheNames = "items", key = "'all'")
    })
    public void delete(Long id) {
        log.debug("CACHE EVICT [itemById:{}, items] — deleting item", id);
        Item item = getEntity(id);
        itemRepository.delete(item);
    }

    private Item getEntity(Long id) {
        return itemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + id));
    }

    private void apply(Item item, ItemRequest request) {
        Category category = categoryService.getEntity(request.categoryId());
        item.setName(request.name());
        item.setDescription(request.description());
        item.setPrice(request.price());
        item.setCategory(category);
    }

    private ItemResponse toResponse(Item item) {
        return new ItemResponse(
                item.getId(),
                item.getName(),
                item.getDescription(),
                item.getPrice(),
                item.getCategory().getId(),
                item.getCategory().getName()
        );
    }
}
