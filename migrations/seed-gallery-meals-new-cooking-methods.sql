-- =============================================================================
-- Gallery meals for the 10 cooking methods that had no meals:
-- ferment, preserve, pressure_cook, slow_cook, sous_vide, dehydrate, spherify,
-- flambe, grind, mill
-- =============================================================================
-- Run after seed-gallery-meals.sql / seed-gallery-meals-restore.sql and
-- seed-food-items (base/protein/vegetable IDs must exist).
-- =============================================================================

INSERT INTO public.gallery_meals (title, description, base_id, protein_id, vegetable_id, cooking_method, base_group, meal_type, sort_order) VALUES
-- Ferment
('Kimchi Fried Rice', 'Korean fried rice with fermented kimchi, egg, and sesame', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333312', 'ferment', 'rice', 'any', 401),
('Miso Glazed Salmon', 'Salmon with fermented miso, rice, and greens', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222206', '33333333-3333-3333-3333-333333333301', 'ferment', 'rice', 'any', 402),
('Tempeh Bowl', 'Fermented tempeh with quinoa and vegetables', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222212', '33333333-3333-3333-3333-333333333306', 'ferment', 'quinoa', 'any', 403),
-- Preserve
('Duck Confit', 'Preserved duck leg with potatoes and herbs', '11111111-1111-1111-1111-111111111115', '22222222-2222-2222-2222-222222222219', '33333333-3333-3333-3333-33333333330c', 'preserve', 'potato', 'any', 404),
('Confit Salmon', 'Preserved salmon with dill and lemon', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222206', '33333333-3333-3333-3333-333333333305', 'preserve', 'rice', 'any', 405),
('Preserved Lemon Chicken', 'Chicken with preserved lemon, olives, and rice', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333306', 'preserve', 'rice', 'any', 406),
-- Pressure cook
('Pressure Cooker Risotto', 'Creamy risotto with mushrooms, made in a pressure cooker', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-33333333330a', 'pressure_cook', 'rice', 'any', 407),
('Pressure Cooker Beef Stew', 'Tender beef stew with potatoes and carrots', '11111111-1111-1111-1111-111111111115', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-333333333307', 'pressure_cook', 'potato', 'any', 408),
('Instant Pot Chicken and Rice', 'One-pot chicken, rice, and vegetables', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333302', 'pressure_cook', 'rice', 'any', 409),
-- Slow cook
('Slow Cooker Carnitas', 'Pork shoulder tacos with lime and cilantro', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-22222222220c', '33333333-3333-3333-3333-33333333330d', 'slow_cook', 'tortilla', 'any', 410),
('Slow Cooker Pulled Chicken', 'Shredded chicken with barbecue sauce on bread', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333305', 'slow_cook', 'bread', 'any', 411),
('Slow Cooker Dal', 'Indian lentils with spices and rice', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222211', '33333333-3333-3333-3333-333333333305', 'slow_cook', 'rice', 'any', 412),
-- Sous vide
('Sous Vide Salmon', 'Perfectly cooked salmon with herbs and vegetables', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222206', '33333333-3333-3333-3333-333333333302', 'sous_vide', 'rice', 'any', 413),
('Sous Vide Steak', 'Medium-rare steak with roasted vegetables', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-333333333311', 'sous_vide', 'quinoa', 'any', 414),
('Sous Vide Chicken Breast', 'Juicy chicken with quinoa and greens', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333303', 'sous_vide', 'quinoa', 'any', 415),
-- Dehydrate
('Beef Jerky', 'Dehydrated seasoned beef', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-333333333313', 'dehydrate', 'bread', 'any', 416),
('Dried Fruit and Nut Bowl', 'Dehydrated fruits with nuts and seeds', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333309', 'dehydrate', 'quinoa', 'any', 417),
('Trail Mix Oatmeal', 'Oatmeal with dehydrated berries and nuts', '11111111-1111-1111-1111-111111111106', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333309', 'dehydrate', 'quinoa', 'breakfast', 418),
-- Spherify (molecular / fancy)
('Spherified Mango Salad', 'Mango pearls with greens and citrus', '11111111-1111-1111-1111-111111111148', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333309', 'spherify', 'salad', 'any', 419),
('Caviar-Style Balsamic', 'Spherified balsamic on caprese', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333305', 'spherify', 'bread', 'any', 420),
-- Flambé
('Bananas Foster', 'Flambéed bananas with rum and ice cream', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333309', 'flambe', 'dessert', 'any', 421),
('Steak Diane', 'Flambéed steak with brandy cream sauce', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-333333333302', 'flambe', 'rice', 'any', 422),
('Crepes Suzette', 'Flambéed orange crepes', '11111111-1111-1111-1111-11111111110a', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333309', 'flambe', 'pancakes', 'breakfast', 423),
-- Grind
('Ground Beef Tacos', 'Seasoned ground beef in tortillas with toppings', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-333333333313', 'grind', 'tortilla', 'any', 424),
('Keema and Rice', 'Indian spiced ground meat with peas and rice', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-33333333330f', 'grind', 'rice', 'any', 425),
('Ground Turkey Bowl', 'Ground turkey with quinoa and vegetables', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222208', '33333333-3333-3333-3333-333333333306', 'grind', 'quinoa', 'any', 426),
-- Mill (ground grains / flour-based)
('Fresh Pasta', 'Handmade pasta from milled flour with tomato and basil', '11111111-1111-1111-1111-11111111110b', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333305', 'mill', 'pasta', 'any', 427),
('Polenta from Stone-Ground Corn', 'Creamy polenta with mushrooms', '11111111-1111-1111-1111-11111111110e', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-33333333330a', 'mill', 'quinoa', 'any', 428),
('Fresh Bread with Soup', 'Fresh milled grain bread with vegetable soup', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333305', 'mill', 'bread', 'any', 429);

-- Run once. Re-running inserts duplicate rows (table has no unique on title/cooking_method).
-- Optional: run the feeling_ids UPDATE from seed-gallery-meals-restore.sql so "How are you feeling?" filters work for these rows.
