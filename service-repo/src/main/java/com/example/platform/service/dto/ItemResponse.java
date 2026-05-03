package com.example.platform.service.dto;

public record ItemResponse(
        Long id,
        String name,
        String description,
        Double price,
        Long categoryId,
        String categoryName
) {
}

