-- Restore gallery meals lost during de-duplication. Run after seed-gallery-meals.sql and seed-gallery-meals-expansion.sql.
-- At the end, feeling_ids are set for all gallery_meals (same logic as seed-gallery-meals-feeling-ids.sql).

INSERT INTO public.gallery_meals (title, description, base_id, protein_id, vegetable_id, cooking_method, base_group, meal_type, sort_order) VALUES
-- Rice bases missing (22)
('Arroz con Pollo', 'Latin American chicken and rice with sofrito, peas, and olives', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-33333333330f', 'stove', 'rice', 'any', 201),
('Biryani', 'Spiced rice with chicken, saffron, basmati, and yogurt', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-33333333330c', 'stove', 'rice', 'any', 202),
('Blackened Fish Rice Bowl', 'Cajun-style blackened fish over rice with bell peppers', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222203', '33333333-3333-3333-3333-333333333306', 'stove', 'rice', 'any', 203),
('Coconut Rice with Mango', 'Thai-style coconut rice with fresh mango', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333309', 'stove', 'rice', 'any', 204),
('Cuban Rice Bowl', 'Rice with mojo, black beans, and citrus-marinated pork', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-22222222220c', '33333333-3333-3333-3333-33333333330a', 'stove', 'rice', 'any', 205),
('Dirty Rice', 'Cajun rice with chicken liver, sausage, and bell peppers', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-22222222221b', '33333333-3333-3333-3333-333333333306', 'stove', 'rice', 'any', 206),
('Gumbo with Rice', 'Louisiana gumbo with sausage, okra, and rice', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-22222222220f', '33333333-3333-3333-3333-333333333320', 'stove', 'rice', 'any', 207),
('Hainan Chicken Rice', 'Singaporean poached chicken with fragrant rice and ginger', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-33333333330d', 'steamed', 'rice', 'any', 208),
('Jambalaya', 'Cajun rice with sausage, shrimp, and bell peppers', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222209', '33333333-3333-3333-3333-333333333306', 'stove', 'rice', 'any', 209),
('Kimchi Fried Rice', 'Korean fried rice with kimchi, egg, and sesame', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333312', 'stove', 'rice', 'any', 210),
('Lemon Rice', 'South Indian rice with lemon, mustard seeds, and curry leaves', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333307', 'stove', 'rice', 'any', 211),
('Nasi Goreng', 'Indonesian fried rice with shrimp, kecap manis, and sambal', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222209', '33333333-3333-3333-3333-333333333307', 'stove', 'rice', 'any', 212),
('Nasi Lemak', 'Malaysian coconut rice with anchovies, sambal, and egg', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333306', 'stove', 'rice', 'any', 213),
('Red Beans and Rice', 'New Orleans style red beans and rice with sausage', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-22222222220a', '33333333-3333-3333-3333-333333333306', 'stove', 'rice', 'any', 214),
('Rice and Stew', 'West African rice with tomato-based stew and vegetables', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-333333333305', 'stove', 'rice', 'any', 215),
('Risotto alla Milanese', 'Saffron risotto with Parmesan and bone marrow', '11111111-1111-1111-1111-111111111114', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-33333333330c', 'stove', 'rice', 'any', 216),
('Seafood Paella', 'Spanish paella with shrimp, mussels, and saffron rice', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222209', '33333333-3333-3333-3333-33333333330f', 'stove', 'rice', 'any', 217),
('Spanish Rice', 'Mexican-style tomato rice with onions and garlic', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-33333333330c', 'stove', 'rice', 'any', 218),
('Thai Fried Rice', 'Thai-style wok fried rice with fish sauce and basil', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333306', 'stove', 'rice', 'any', 219),
('Turkish Rice Pilaf', 'Rice pilaf with orzo, butter, and chicken broth', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-33333333330c', 'stove', 'rice', 'any', 220),
('Yellow Rice', 'Latin American turmeric and annatto rice', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-22222222220a', '33333333-3333-3333-3333-33333333330e', 'stove', 'rice', 'any', 221),
-- Singapore Noodles (curry noodles - user said not in rice list; it is noodles)
('Singapore Noodles', 'Curry rice noodles with shrimp, char siu, and vegetables', '11111111-1111-1111-1111-11111111110c', '22222222-2222-2222-2222-222222222209', '33333333-3333-3333-3333-333333333307', 'stove', 'noodles', 'any', 222),
-- Noodle/Ramen bases missing (skip Bún Bò Huế, Carbonara, Hiyashi Chuka, Pad Kee Mao, Pho Ga - user said present or in pasta)
('Beef Chow Fun', 'Wide rice noodles with beef, bean sprouts, and dark soy', '11111111-1111-1111-1111-11111111110c', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-33333333331c', 'stove', 'noodles', 'any', 223),
('Bún Riêu', 'Vietnamese crab and tomato noodle soup', '11111111-1111-1111-1111-11111111110c', '22222222-2222-2222-2222-222222222213', '33333333-3333-3333-3333-333333333305', 'boiled', 'noodles', 'any', 224),
('Cao Lầu', 'Vietnamese noodles with pork and herbs from Hoi An', '11111111-1111-1111-1111-11111111110c', '22222222-2222-2222-2222-22222222220c', '33333333-3333-3333-3333-333333333313', 'stove', 'noodles', 'any', 225),
('Cold Somen', 'Japanese cold wheat noodles with dipping sauce', '11111111-1111-1111-1111-11111111110c', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-33333333330d', 'raw', 'noodles', 'any', 226),
('Hokkien Mee', 'Malaysian stir-fried prawn noodles with pork and squid', '11111111-1111-1111-1111-11111111110c', '22222222-2222-2222-2222-222222222209', '33333333-3333-3333-3333-333333333306', 'stove', 'noodles', 'any', 227),
('Jajangmyeon', 'Korean black bean noodles with pork and cucumber', '11111111-1111-1111-1111-11111111110c', '22222222-2222-2222-2222-22222222220c', '33333333-3333-3333-3333-33333333330d', 'stove', 'noodles', 'any', 228),
('Khao Piak Sen', 'Lao noodle soup with chicken and herbs', '11111111-1111-1111-1111-11111111110c', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-33333333330c', 'boiled', 'noodles', 'any', 229),
('Laksa', 'Spicy coconut noodle soup with shrimp and tofu', '11111111-1111-1111-1111-11111111110c', '22222222-2222-2222-2222-222222222209', '33333333-3333-3333-3333-333333333306', 'boiled', 'noodles', 'any', 230),
('Mee Rebus', 'Indonesian sweet potato noodle soup with eggs', '11111111-1111-1111-1111-11111111110c', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333310', 'boiled', 'noodles', 'any', 231),
('Mee Siam', 'Malaysian rice vermicelli with tamarind and shrimp', '11111111-1111-1111-1111-11111111110c', '22222222-2222-2222-2222-222222222209', '33333333-3333-3333-3333-333333333307', 'stove', 'noodles', 'any', 232),
('Pad See Ew', 'Thai wide rice noodles with broccoli and dark soy', '11111111-1111-1111-1111-11111111110c', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333302', 'stove', 'noodles', 'any', 233),
('Ramen with Miso', 'Japanese miso ramen with pork, corn, and nori', '11111111-1111-1111-1111-111111111113', '22222222-2222-2222-2222-22222222220c', '33333333-3333-3333-3333-33333333330e', 'boiled', 'noodles', 'any', 234),
('Udon Carbonara', 'Fusion udon noodles with bacon, egg, and Parmesan', '11111111-1111-1111-1111-11111111110c', '22222222-2222-2222-2222-222222222205', '33333333-3333-3333-3333-333333333305', 'stove', 'noodles', 'any', 235),
-- Quinoa/Grain bases missing (use quinoa base 102, base_group quinoa for grain bowls)
('Amaranth Bowl', 'Ancient grain bowl with vegetables and seeds', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333306', 'stove', 'quinoa', 'any', 236),
('Barley Risotto', 'Creamy barley with mushrooms and Parmesan', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-33333333330a', 'stove', 'quinoa', 'any', 237),
('Buckwheat Bowl', 'Nutty buckwheat with roasted vegetables', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222212', '33333333-3333-3333-3333-333333333307', 'stove', 'quinoa', 'any', 238),
('Bulgur Pilaf', 'Middle Eastern bulgur with tomatoes and herbs', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222211', '33333333-3333-3333-3333-333333333305', 'stove', 'quinoa', 'any', 239),
('Farro Bowl', 'Chewy farro with roasted vegetables and feta', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333311', 'stove', 'quinoa', 'any', 240),
('Freekeh Bowl', 'Smoky freekeh with chickpeas and herbs', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222212', '33333333-3333-3333-3333-333333333303', 'stove', 'quinoa', 'any', 241),
('Kasha Bowl', 'Eastern European buckwheat kasha with mushrooms', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-33333333330a', 'stove', 'quinoa', 'any', 242),
('Millet Bowl', 'Millet with roasted squash and greens', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222212', '33333333-3333-3333-3333-333333333310', 'stove', 'quinoa', 'any', 243),
('Oatmeal Savory Bowl', 'Savory oatmeal with egg, cheese, and greens', '11111111-1111-1111-1111-111111111106', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333303', 'stove', 'quinoa', 'breakfast', 244),
('Polenta Bowl', 'Creamy polenta with mushrooms and Parmesan', '11111111-1111-1111-1111-11111111110e', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-33333333330a', 'stove', 'quinoa', 'any', 245),
('Sorghum Bowl', 'Whole grain sorghum with black beans and lime', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-22222222220a', '33333333-3333-3333-3333-33333333330e', 'stove', 'quinoa', 'any', 246),
('Teff Bowl', 'Ethiopian teff with lentils and greens', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222211', '33333333-3333-3333-3333-33333333330b', 'stove', 'quinoa', 'any', 247),
('Wheatberry Bowl', 'Chewy wheat berries with roasted vegetables', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222212', '33333333-3333-3333-3333-333333333307', 'stove', 'quinoa', 'any', 248),
('Wild Rice Bowl', 'Wild rice with cranberries and pecans', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222206', '33333333-3333-3333-3333-333333333309', 'stove', 'quinoa', 'any', 249),
('Quinoa Tabouli', 'Lebanese-style tabbouleh with quinoa instead of bulgur', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333305', 'raw', 'quinoa', 'any', 250),
-- Tortilla/Wrap missing (14; Tacos al Pastor in expansion)
('Al Pastor Tacos', 'Marinated pork tacos with pineapple and cilantro', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-22222222220c', '33333333-3333-3333-3333-333333333306', 'grilled', 'tortilla', 'any', 251),
('Breakfast Burrito', 'Scrambled eggs, beans, cheese, and salsa in a tortilla', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-33333333330a', 'stove', 'tortilla', 'breakfast', 252),
('Carnitas Tacos', 'Slow-cooked pork tacos with lime and cilantro', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-22222222220c', '33333333-3333-3333-3333-33333333330d', 'stove', 'tortilla', 'any', 253),
('Chicken Quesadilla', 'Grilled tortilla with chicken, cheese, and peppers', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333306', 'grilled', 'tortilla', 'any', 254),
('Chimichanga', 'Deep-fried burrito with beef, beans, and cheese', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-333333333305', 'stove', 'tortilla', 'any', 255),
('Enchiladas', 'Tortillas in chili sauce with chicken and cheese', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333305', 'baked', 'tortilla', 'any', 256),
('Flautas', 'Rolled and fried tortillas with chicken or beef', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333312', 'stove', 'tortilla', 'any', 257),
('Mushroom Tacos', 'Grilled mushroom tacos with avocado and lime', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-33333333330a', 'grilled', 'tortilla', 'any', 258),
('Pescado Tacos', 'Baja-style fish tacos with cabbage and crema', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222203', '33333333-3333-3333-3333-333333333312', 'grilled', 'tortilla', 'any', 259),
('Shrimp Quesadilla', 'Grilled tortilla with shrimp, cheese, and lime', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222209', '33333333-3333-3333-3333-333333333306', 'grilled', 'tortilla', 'any', 260),
('Soft Tacos', 'Soft tortillas with your choice of filling', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-333333333305', 'grilled', 'tortilla', 'any', 261),
('Taco Salad', 'Crispy tortilla bowl with seasoned beef and toppings', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-333333333313', 'stove', 'tortilla', 'any', 262),
('Taquitos', 'Rolled and fried tortillas with chicken or beef', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-33333333330c', 'stove', 'tortilla', 'any', 263),
('Veggie Burrito', 'Tortilla with beans, rice, vegetables, and cheese', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-22222222220a', '33333333-3333-3333-3333-333333333306', 'stove', 'tortilla', 'any', 264),
-- Bread/Toast missing (16)
('Bacon Lettuce Tomato Sandwich', 'BLT with crispy bacon, lettuce, and tomato on toast', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222205', '33333333-3333-3333-3333-333333333313', 'stove', 'bread', 'any', 265),
('Baguette Sandwich', 'French baguette with cheese, ham, or butter', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222210', '33333333-3333-3333-3333-333333333305', 'raw', 'bread', 'any', 266),
('Breakfast Sandwich', 'Egg, cheese, and bacon or sausage on a roll', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333305', 'stove', 'bread', 'breakfast', 267),
('Caprese Sandwich', 'Tomato, mozzarella, and basil on ciabatta', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333305', 'raw', 'bread', 'any', 268),
('Cheese Toastie', 'Grilled cheese sandwich with butter', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333305', 'stove', 'bread', 'any', 269),
('Club Sandwich', 'Triple-decker with turkey, bacon, lettuce, and tomato', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222208', '33333333-3333-3333-3333-333333333313', 'stove', 'bread', 'any', 270),
('Croissant Sandwich', 'Buttery croissant with egg, cheese, and ham', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222210', '33333333-3333-3333-3333-333333333304', 'stove', 'bread', 'breakfast', 271),
('Egg Salad Sandwich', 'Creamy egg salad on bread with lettuce', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333313', 'stove', 'bread', 'any', 272),
('French Dip', 'Roast beef on roll with au jus for dipping', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-33333333330c', 'stove', 'bread', 'any', 273),
('Grilled Cheese', 'Melted cheese between buttered bread', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333305', 'stove', 'bread', 'any', 274),
('Ham Sandwich', 'Sliced ham with cheese and mustard on bread', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222210', '33333333-3333-3333-3333-333333333313', 'raw', 'bread', 'any', 275),
('Meatball Sub', 'Meatballs in marinara on a hoagie roll with cheese', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-333333333305', 'stove', 'bread', 'any', 276),
('Philly Cheesesteak', 'Sliced beef and cheese on a hoagie roll', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-33333333330c', 'stove', 'bread', 'any', 277),
('Reuben Sandwich', 'Corned beef, sauerkraut, Swiss, and Russian on rye', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-333333333312', 'stove', 'bread', 'any', 278),
('Tuna Melt', 'Tuna salad with cheese grilled on bread', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-22222222220e', '33333333-3333-3333-3333-333333333305', 'stove', 'bread', 'any', 279),
('Turkey Sandwich', 'Sliced turkey with lettuce, tomato, and mayo', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222208', '33333333-3333-3333-3333-333333333313', 'raw', 'bread', 'any', 280),
-- Breakfast/Sweet missing (skip Biscuits & Gravy, Frittata, Omelette, Pancakes - user said present)
('Acai Bowl', 'Brazilian acai puree with granola, banana, and berries', '11111111-1111-1111-1111-111111111108', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333309', 'raw', 'breakfast', 'breakfast', 281),
('Banana Pancakes', 'Fluffy pancakes with mashed banana and maple syrup', '11111111-1111-1111-1111-11111111110a', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333309', 'stove', 'breakfast', 'breakfast', 282),
('Breakfast Bowl', 'Grain bowl with egg, avocado, and vegetables', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333304', 'stove', 'breakfast', 'breakfast', 283),
('Breakfast Quesadilla', 'Tortilla with eggs, cheese, and salsa', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333305', 'stove', 'tortilla', 'breakfast', 284),
('Chaffles', 'Cheese and egg waffles, low-carb', '11111111-1111-1111-1111-11111111110a', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333305', 'stove', 'breakfast', 'breakfast', 285),
('Cinnamon Rolls', 'Sweet rolled dough with cinnamon and cream cheese frosting', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333309', 'baked', 'breakfast', 'breakfast', 286),
('Coffee Cake', 'Cinnamon streusel cake with coffee', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333309', 'baked', 'breakfast', 'breakfast', 287),
('Corned Beef Hash', 'Pan-fried corned beef with potatoes and onions', '11111111-1111-1111-1111-111111111115', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-33333333330c', 'stove', 'breakfast', 'breakfast', 288),
('Granola Bowl', 'Granola with yogurt, fruit, and honey', '11111111-1111-1111-1111-111111111108', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333309', 'raw', 'breakfast', 'breakfast', 289),
('Hash Browns', 'Crispy shredded potato pancakes', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-33333333330c', 'stove', 'breakfast', 'breakfast', 290),
('Huevos Divorciados', 'Two eggs with red and green salsa, beans, and tortillas', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333305', 'stove', 'tortilla', 'breakfast', 291),
('Muffins', 'Sweet or savory baked muffins', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333309', 'baked', 'breakfast', 'breakfast', 292),
('Smoothie Bowl', 'Thick smoothie in a bowl with granola and fruit', '11111111-1111-1111-1111-111111111108', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333309', 'raw', 'breakfast', 'breakfast', 293),
('Strata', 'Baked egg casserole with bread, cheese, and vegetables', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333306', 'baked', 'breakfast', 'breakfast', 294),
('French Toast', 'Bread dipped in egg and milk, pan-fried with syrup', '11111111-1111-1111-1111-111111111107', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333309', 'stove', 'toast', 'breakfast', 295),
-- Pasta/Italian missing (skip Bolognese, Fettuccine Alfredo, Lasagna, Pesto - user said present)
('Baked Ziti', 'Pasta with tomato sauce, ricotta, and mozzarella baked', '11111111-1111-1111-1111-11111111110b', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-333333333305', 'baked', 'pasta', 'any', 296),
('Cacio e Pepe', 'Roman pasta with Pecorino and black pepper', '11111111-1111-1111-1111-11111111110b', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333305', 'stove', 'pasta', 'any', 297),
('Chicken Parmesan', 'Breaded chicken with marinara and melted cheese over pasta', '11111111-1111-1111-1111-11111111110b', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333305', 'baked', 'pasta', 'any', 298),
('Eggplant Parmesan', 'Breaded eggplant with marinara and cheese', '11111111-1111-1111-1111-11111111110b', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333311', 'baked', 'pasta', 'any', 299),
('Linguine with Clams', 'Pasta with clams, garlic, white wine, and parsley', '11111111-1111-1111-1111-11111111110b', '22222222-2222-2222-2222-222222222220', '33333333-3333-3333-3333-333333333305', 'stove', 'pasta', 'any', 300),
('Mac and Cheese', 'Creamy cheese sauce with elbow macaroni', '11111111-1111-1111-1111-11111111110b', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333305', 'stove', 'pasta', 'any', 301),
('Penne alla Vodka', 'Penne in tomato cream sauce with vodka', '11111111-1111-1111-1111-11111111110b', '22222222-2222-2222-2222-222222222209', '33333333-3333-3333-3333-333333333305', 'stove', 'pasta', 'any', 302),
('Ravioli', 'Filled pasta with cheese or meat in sauce', '11111111-1111-1111-1111-11111111110b', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333303', 'stove', 'pasta', 'any', 303),
('Spaghetti Aglio e Olio', 'Pasta with garlic, olive oil, and chili', '11111111-1111-1111-1111-11111111110b', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-33333333330c', 'stove', 'pasta', 'any', 304),
('Tortellini', 'Stuffed pasta in broth or cream sauce', '11111111-1111-1111-1111-11111111110b', '22222222-2222-2222-2222-22222222220c', '33333333-3333-3333-3333-333333333305', 'stove', 'pasta', 'any', 305),
('Gnocchi', 'Potato dumplings with sage butter or tomato sauce', '11111111-1111-1111-1111-111111111117', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-33333333330a', 'stove', 'pasta', 'any', 306),
-- Completely missing cuisines (African, Eastern European, Latin American, Middle Eastern, Indian, Other)
('Jollof Rice', 'West African one-pot rice with tomatoes and spices', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333305', 'stove', 'rice', 'any', 307),
('Egusi Soup', 'Nigerian melon seed soup with leafy greens', '11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222212', '33333333-3333-3333-3333-333333333303', 'stove', 'legume', 'any', 308),
('Fufu with Soup', 'West African pounded starch with groundnut or palm nut soup', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-22222222220a', '33333333-3333-3333-3333-333333333320', 'stove', 'rice', 'any', 309),
('Couscous Royale', 'North African couscous with lamb, vegetables, and chickpeas', '11111111-1111-1111-1111-11111111110d', '22222222-2222-2222-2222-22222222220d', '33333333-3333-3333-3333-333333333307', 'stove', 'quinoa', 'any', 310),
('Beef Stroganoff', 'Russian beef in sour cream sauce over egg noodles', '11111111-1111-1111-1111-11111111110c', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-33333333330a', 'stove', 'noodles', 'any', 311),
('Pelmeni', 'Russian dumplings with meat filling and sour cream', '11111111-1111-1111-1111-11111111110b', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-33333333330c', 'boiled', 'pasta', 'any', 312),
('Borscht', 'Ukrainian beet soup with beef and sour cream', '11111111-1111-1111-1111-111111111144', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-333333333305', 'stove', 'soup', 'any', 313),
('Goulash', 'Hungarian beef stew with paprika and potatoes', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-33333333330c', 'stove', 'rice', 'any', 314),
('Schnitzel', 'Austrian breaded and fried veal or pork with lemon', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-22222222220c', '33333333-3333-3333-3333-333333333305', 'stove', 'bread', 'any', 315),
('Feijoada', 'Brazilian black bean stew with pork and rice', '11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-22222222220c', '33333333-3333-3333-3333-33333333330c', 'stove', 'legume', 'any', 316),
('Ceviche', 'Peruvian raw fish cured in lime with onion and cilantro', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222203', '33333333-3333-3333-3333-33333333330d', 'raw', 'rice', 'any', 317),
('Empanadas', 'Latin American filled pastries, baked or fried', '11111111-1111-1111-1111-111111111123', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-33333333330c', 'baked', 'dough', 'any', 318),
('Arepas', 'Venezuelan corn cakes with cheese, beans, or meat', '11111111-1111-1111-1111-11111111111d', '22222222-2222-2222-2222-222222222212', '33333333-3333-3333-3333-333333333304', 'grilled', 'corn', 'any', 319),
('Pupusas', 'Salvadoran stuffed corn masa with curtido', '11111111-1111-1111-1111-11111111111e', '22222222-2222-2222-2222-22222222220a', '33333333-3333-3333-3333-333333333312', 'stove', 'corn', 'any', 320),
('Shawarma Plate', 'Middle Eastern spiced meat with rice, hummus, and salad', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333313', 'grilled', 'rice', 'any', 321),
('Kofta Kebabs', 'Middle Eastern spiced meatballs with rice or flatbread', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-33333333330c', 'grilled', 'bread', 'any', 322),
('Fattoush Salad', 'Levantine bread salad with sumac and pomegranate', '11111111-1111-1111-1111-111111111147', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333313', 'raw', 'salad', 'any', 323),
('Mujadara', 'Lentils and rice with caramelized onions', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222211', '33333333-3333-3333-3333-33333333330c', 'stove', 'rice', 'any', 324),
('Chana Masala', 'Indian chickpea curry with tomatoes and spices', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222212', '33333333-3333-3333-3333-333333333305', 'stove', 'rice', 'any', 325),
('Palak Paneer', 'Indian spinach and paneer in spiced cream', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333303', 'stove', 'rice', 'any', 326),
('Butter Chicken', 'Indian chicken in tomato butter cream sauce', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333305', 'stove', 'rice', 'any', 327),
('Rogan Josh', 'Kashmiri lamb curry with yogurt and spices', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-22222222220d', '33333333-3333-3333-3333-33333333330c', 'stove', 'rice', 'any', 328),
('Fish and Chips', 'British beer-battered fish with fries', '11111111-1111-1111-1111-111111111115', '22222222-2222-2222-2222-222222222203', '33333333-3333-3333-3333-333333333315', 'stove', 'potato', 'any', 329),
('Poutine', 'Canadian fries with cheese curds and gravy', '11111111-1111-1111-1111-111111111115', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333305', 'stove', 'potato', 'any', 330),
('Fondue', 'Swiss melted cheese with bread for dipping', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333305', 'stove', 'bread', 'any', 331)
);

-- Wire feeling_ids for "How are you feeling?" (same logic as seed-gallery-meals-feeling-ids.sql)
UPDATE public.gallery_meals
SET feeling_ids = (
  SELECT COALESCE(array_agg(DISTINCT elem), '{}') FROM (
    SELECT unnest(
      (CASE WHEN base_group IN ('soup', 'chowders', 'bisques', 'broth soups') OR (cooking_method IN ('baked', 'stove', 'boiled', 'steamed') AND base_group IN ('pasta', 'rice', 'bread', 'potato', 'dough', 'legume', 'corn')) THEN ARRAY['warm_me_up', 'hearty', 'comforting', 'cozy'] ELSE ARRAY[]::TEXT[] END) ||
      (CASE WHEN base_group IN ('salad', 'kale caesar', 'cobb salad', 'nicoise salad', 'seaweed', 'seaweed salad', 'nori wraps', 'kelp noodles', 'chia pudding') OR cooking_method = 'raw' THEN ARRAY['cool_me_off', 'light', 'cleansing', 'refreshing'] ELSE ARRAY[]::TEXT[] END) ||
      (CASE WHEN base_group IN ('quinoa', 'seed', 'plant', 'toast') THEN ARRAY['light', 'cleansing'] ELSE ARRAY[]::TEXT[] END) ||
      (CASE WHEN base_group IN ('pasta', 'dough', 'potato', 'legume', 'bread') THEN ARRAY['heavy', 'hearty'] ELSE ARRAY[]::TEXT[] END) ||
      (CASE WHEN base_group IN ('rice', 'potato', 'pasta', 'bread', 'legume', 'soup', 'tortilla') THEN ARRAY['hearty', 'comforting'] ELSE ARRAY[]::TEXT[] END) ||
      (CASE WHEN base_group IN ('legume', 'quinoa', 'potato', 'bread', 'fermented') THEN ARRAY['earthy'] ELSE ARRAY[]::TEXT[] END) ||
      (CASE WHEN base_group IN ('breakfast', 'quinoa', 'rice', 'seed') THEN ARRAY['rejuvenating', 'energy_booster'] ELSE ARRAY[]::TEXT[] END) ||
      (CASE WHEN base_group IN ('breakfast', 'toast', 'bread', 'pasta', 'rice') THEN ARRAY['energy_booster', 'simple'] ELSE ARRAY[]::TEXT[] END) ||
      (CASE WHEN base_group IN ('dessert', 'pasta', 'bread') OR base_group = 'pizza' THEN ARRAY['indulgent'] ELSE ARRAY[]::TEXT[] END) ||
      (CASE WHEN base_group IN ('rice', 'bread', 'toast', 'pasta') THEN ARRAY['simple'] ELSE ARRAY[]::TEXT[] END) ||
      (CASE WHEN base_group IN ('noodles', 'sushi', 'fermented', 'seaweed', 'dough') THEN ARRAY['adventurous'] ELSE ARRAY[]::TEXT[] END)
    ) AS elem
  ) sub
);

UPDATE public.gallery_meals
SET feeling_ids = ARRAY['simple']
WHERE feeling_ids IS NULL OR array_length(feeling_ids, 1) IS NULL;