-- ══════════════════════════════════════════════════════════════════
-- Idempotent seed data — current state as of last database export
-- Run on every startup (ddl-auto: update keeps existing rows safe)
-- ══════════════════════════════════════════════════════════════════

-- ─── CATEGORIES ───────────────────────────────────────────────────
INSERT INTO categories (id, name, description)
VALUES
    (1,  'General',        'General-purpose category'),
    (2,  'Electronics',    'Devices and accessories'),
    (3,  'Books',          'Printed and digital books'),
    (7,  'Computer and IT','Computer and IT'),
    (11, 'Literature',     'Literature1'),
    (30, 'Indian History', 'Indian History')
ON CONFLICT (id) DO UPDATE
    SET name        = EXCLUDED.name,
        description = EXCLUDED.description;

-- Restore sequence to the highest known ID so new inserts don't collide
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));

-- ─── ITEMS ────────────────────────────────────────────────────────
INSERT INTO items (id, name, description, price, category_id)
VALUES
    (1, 'Starter Notebook',  'Lined notebook for daily notes',          4.99,  7),
    (2, 'Wireless Mouse',    '2.4GHz ergonomic mouse',                 19.99,  2),
    (3, 'Spring in Action',  'Sample technical reference title1',       39.50,  3),
    (4, 'A4 Notebook1',      '200 pages ruled notebook',                5.99,  1)
ON CONFLICT (id) DO UPDATE
    SET name        = EXCLUDED.name,
        description = EXCLUDED.description,
        price       = EXCLUDED.price,
        category_id = EXCLUDED.category_id;

-- Restore sequence
SELECT setval('items_id_seq', (SELECT MAX(id) FROM items));
