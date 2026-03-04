-- Gallery meals expansion: dishes using new bases, proteins, vegetables.
-- Run AFTER seed-gallery-meals.sql and seed-food-items-expansion.sql.
-- sort_order continues from 151.

INSERT INTO public.gallery_meals (title, description, base_id, protein_id, vegetable_id, cooking_method, base_group, meal_type, sort_order) VALUES
-- Potato-based
('Pierogi', 'Boiled potato dumplings, onions, sour cream, butter', '11111111-1111-1111-1111-111111111116', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-33333333330c', 'boiled', 'potato', 'any', 151),
('Gnocchi', 'Stove potato dumplings, sage, butter, parmesan', '11111111-1111-1111-1111-111111111117', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333305', 'stove', 'potato', 'any', 152),
('Potato Skins', 'Baked potato halves, bacon, cheese, green onions', '11111111-1111-1111-1111-111111111118', '22222222-2222-2222-2222-222222222205', '33333333-3333-3333-3333-333333333305', 'baked', 'potato', 'any', 153),
('Latkes', 'Stove potato pancakes, applesauce, sour cream', '11111111-1111-1111-1111-111111111119', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-33333333330c', 'stove', 'potato', 'any', 154),
('Aloo Gobi', 'Stove potato and cauliflower, turmeric, cumin, peas', '11111111-1111-1111-1111-11111111111a', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333302', 'stove', 'potato', 'any', 155),
-- Corn-based
('Tamales', 'Steamed corn masa, pork, chili, banana leaf', '11111111-1111-1111-1111-11111111111c', '22222222-2222-2222-2222-22222222220c', '33333333-3333-3333-3333-333333333306', 'steam', 'corn', 'any', 156),
('Arepas', 'Grilled corn cakes, cheese, black beans, avocado', '11111111-1111-1111-1111-11111111111d', '22222222-2222-2222-2222-22222222220a', '33333333-3333-3333-3333-333333333304', 'grill', 'corn', 'any', 157),
('Pupusas', 'Stove corn masa, beans, cheese, curtido', '11111111-1111-1111-1111-11111111111e', '22222222-2222-2222-2222-222222222212', '33333333-3333-3333-3333-333333333312', 'stove', 'corn', 'any', 158),
('Pozole', 'Boiled hominy, pork, radish, lime, oregano', '11111111-1111-1111-1111-11111111111f', '22222222-2222-2222-2222-22222222220c', '33333333-3333-3333-3333-33333333330c', 'boiled', 'corn', 'any', 159),
('Corn Chowder', 'Stove corn, potatoes, bacon, cream', '11111111-1111-1111-1111-111111111120', '22222222-2222-2222-2222-222222222205', '33333333-3333-3333-3333-33333333330e', 'stove', 'corn', 'any', 160),
-- Dough-based
('Margherita Pizza', 'Baked pizza dough, tomatoes, mozzarella, basil', '11111111-1111-1111-1111-111111111121', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333305', 'bake', 'pizza', 'any', 161),
('Calzone', 'Baked stuffed dough, ham, ricotta, marinara', '11111111-1111-1111-1111-111111111122', '22222222-2222-2222-2222-222222222210', '33333333-3333-3333-3333-333333333305', 'bake', 'pizza', 'any', 162),
('Beef Empanadas', 'Baked pastry, beef, onions, olives, egg', '11111111-1111-1111-1111-111111111123', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-33333333330c', 'bake', 'dough', 'any', 163),
('Samosas', 'Stove pastry, potatoes, peas, cumin, cilantro', '11111111-1111-1111-1111-111111111124', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-33333333330f', 'stove', 'dough', 'any', 164),
-- Legume-based
('Falafel Bowl', 'Fried chickpea fritters, tahini, cucumber, tomato', '11111111-1111-1111-1111-111111111126', '22222222-2222-2222-2222-222222222212', '33333333-3333-3333-3333-33333333330d', 'stove', 'legume', 'any', 165),
('Dal Makhani', 'Slow-cooked lentils, cream, butter, ginger', '11111111-1111-1111-1111-111111111127', '22222222-2222-2222-2222-222222222211', '33333333-3333-3333-3333-33333333330a', 'stove', 'legume', 'any', 166),
('Hummus Bowl', 'Raw chickpea spread, olive oil, zaatar, vegetables', '11111111-1111-1111-1111-111111111128', '22222222-2222-2222-2222-222222222212', '33333333-3333-3333-3333-33333333330d', 'raw', 'legume', 'any', 167),
-- Plant-based
('Cauliflower Rice Bowl', 'Stove cauliflower rice, tofu, broccoli, soy', '11111111-1111-1111-1111-11111111112c', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333302', 'stove', 'plant', 'any', 168),
('Zucchini Noodle Pasta', 'Raw zucchini noodles, basil, tomatoes, parmesan', '11111111-1111-1111-1111-11111111112e', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333305', 'raw', 'plant', 'any', 169),
-- Bread varieties
('Focaccia', 'Baked olive oil bread, rosemary, sea salt', '11111111-1111-1111-1111-111111111132', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333305', 'bake', 'bread', 'any', 170),
('Naan with Dal', 'Grilled flatbread, lentils, cilantro, lime', '11111111-1111-1111-1111-111111111135', '22222222-2222-2222-2222-222222222211', '33333333-3333-3333-3333-333333333304', 'grill', 'bread', 'any', 171),
-- Fermented / special bases
('Injera with Lentils', 'Fermented teff flatbread, berbere lentils, spinach', '11111111-1111-1111-1111-111111111139', '22222222-2222-2222-2222-222222222211', '33333333-3333-3333-3333-333333333303', 'stove', 'fermented', 'any', 172),
('Dosas', 'Stove fermented rice crepe, potato filling, chutney', '11111111-1111-1111-1111-11111111113a', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-33333333330c', 'stove', 'fermented', 'any', 173),
-- Seaweed
('Nori Wrap', 'Raw nori, rice, salmon, cucumber, avocado', '11111111-1111-1111-1111-11111111113b', '22222222-2222-2222-2222-222222222206', '33333333-3333-3333-3333-33333333330d', 'raw', 'seaweed', 'any', 174),
('Seaweed Salad', 'Raw wakame, sesame, cucumber, rice vinegar', '11111111-1111-1111-1111-11111111113d', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333317', 'raw', 'seaweed', 'any', 175),
-- Seed-based
('Chia Pudding', 'Raw chia, almond milk, berries, honey', '11111111-1111-1111-1111-111111111142', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333309', 'raw', 'seed', 'breakfast', 176),
-- Soup bases
('New England Clam Chowder', 'Cream chowder, clams, potatoes, bacon', '11111111-1111-1111-1111-111111111145', '22222222-2222-2222-2222-222222222220', '33333333-3333-3333-3333-333333333315', 'stove', 'soup', 'any', 177),
('French Onion Soup', 'Broth, caramelized onions, bread, cheese', '11111111-1111-1111-1111-111111111144', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-33333333330c', 'stove', 'soup', 'any', 178),
('Tom Yum Soup', 'Boiled broth, shrimp, mushrooms, lime, chili', '11111111-1111-1111-1111-111111111144', '22222222-2222-2222-2222-222222222209', '33333333-3333-3333-3333-33333333330a', 'boiled', 'soup', 'any', 179),
-- Salad bases
('Kale Caesar', 'Raw kale, parmesan, Caesar dressing, croutons', '11111111-1111-1111-1111-111111111147', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-33333333330b', 'raw', 'salad', 'any', 180),
('Cobb Salad', 'Lettuce, chicken, bacon, egg, avocado, blue cheese', '11111111-1111-1111-1111-111111111148', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333304', 'raw', 'salad', 'any', 181),
('Niçoise Salad', 'Salad greens, tuna, green beans, olives, egg', '11111111-1111-1111-1111-111111111149', '22222222-2222-2222-2222-22222222220e', '33333333-3333-3333-3333-333333333315', 'raw', 'salad', 'any', 182),
-- Sushi & regional
('Sushi Roll', 'Sushi rice, raw salmon, nori, cucumber, ginger', '11111111-1111-1111-1111-11111111114a', '22222222-2222-2222-2222-222222222206', '33333333-3333-3333-3333-33333333330d', 'raw', 'sushi', 'any', 183),
('Gumbo', 'Stove roux, sausage, okra, bell peppers, file', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-22222222220f', '33333333-3333-3333-3333-333333333320', 'stove', 'rice', 'any', 184),
('Tacos al Pastor', 'Grilled pork, pineapple, tortilla, achiote, cilantro', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-22222222220c', '33333333-3333-3333-3333-333333333306', 'grill', 'tortilla', 'any', 185),
-- New proteins
('Duck Confit', 'Preserved duck leg, potatoes, garlic, thyme', '11111111-1111-1111-1111-111111111115', '22222222-2222-2222-2222-222222222219', '33333333-3333-3333-3333-33333333330c', 'stove', 'potato', 'any', 186),
('Clam Linguine', 'Stove pasta, clams, garlic, white wine, parsley', '11111111-1111-1111-1111-11111111110b', '22222222-2222-2222-2222-222222222220', '33333333-3333-3333-3333-333333333305', 'stove', 'pasta', 'any', 187),
('Lobster Roll', 'Butter-poached lobster, bread, celery, lemon', '11111111-1111-1111-1111-111111111134', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-33333333330d', 'stove', 'bread', 'any', 188),
('Jackfruit Tacos', 'Stove jackfruit, tortilla, slaw, lime, cilantro', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-22222222222f', '33333333-3333-3333-3333-333333333312', 'stove', 'tortilla', 'any', 189),
('Grilled Octopus', 'Grilled octopus, olive oil, lemon, oregano', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222233', '33333333-3333-3333-3333-333333333305', 'grill', 'bread', 'any', 190),
-- Breakfast/brunch
('Quiche Lorraine', 'Baked phyllo, eggs, bacon, cheese, cream', '11111111-1111-1111-1111-11111111114b', '22222222-2222-2222-2222-222222222204', '22222222-2222-2222-2222-222222222205', 'bake', 'breakfast', 'breakfast', 191),
('Eggs Benedict', 'Poached eggs, English muffin, ham, hollandaise', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333305', 'steam', 'bread', 'breakfast', 192),
('Chilaquiles', 'Stove tortilla chips, salsa, eggs, crema, avocado', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333304', 'stove', 'tortilla', 'breakfast', 193),
('Dutch Baby', 'Baked puffed pancake, lemon, powdered sugar, berries', '11111111-1111-1111-1111-11111111110a', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333309', 'bake', 'pancakes', 'breakfast', 194),
('Crepes', 'Stove thin pancakes, Nutella or ham cheese, berries', '11111111-1111-1111-1111-11111111110a', '22222222-2222-2222-2222-222222222210', '33333333-3333-3333-3333-333333333309', 'stove', 'pancakes', 'breakfast', 195),
('Waffles', 'Stove crispy waffles, butter, syrup, berries', '11111111-1111-1111-1111-11111111110a', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333309', 'stove', 'pancakes', 'breakfast', 196),
('Baklava', 'Baked phyllo, nuts, honey, rose water', '11111111-1111-1111-1111-11111111114b', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333306', 'baked', 'dessert', 'any', 197),
-- Desserts (base+protein+veg as placeholder where needed)
('Chocolate Lava Cake', 'Baked chocolate cake, molten center, vanilla ice cream', '11111111-1111-1111-1111-111111111121', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333309', 'baked', 'dessert', 'any', 198),
('Tiramisu', 'Coffee-soaked ladyfingers, mascarpone, cocoa', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333305', 'raw', 'dessert', 'any', 199),
('Churros', 'Fried dough, cinnamon sugar, chocolate sauce', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333309', 'stove', 'dessert', 'any', 200);
