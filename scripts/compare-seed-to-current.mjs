import fs from 'fs'

const seed1 = fs.readFileSync('supabase/seed-gallery-meals.sql', 'utf8')
const seed2 = fs.readFileSync('supabase/seed-gallery-meals-expansion.sql', 'utf8')
const re = /\('([^']+)',/g
const seedTitles = new Set()
let m
while ((m = re.exec(seed1)) !== null) seedTitles.add(m[1])
while ((m = re.exec(seed2)) !== null) seedTitles.add(m[1])

// Current list from the user's screenshot (355 meals)
const currentList = `Greek Chicken Rice Bowl
Jajangmyeon
Moroccan Quinoa
Caviar-Style Balsamic
Chaffles
Chicken Parmesan
Swiss Bircher Muesli
Australian Avocado Smash
Thai Drunken Noodles
Indian Masala Omelette
Singapore Noodles
Clam Linguine
Lebanese Spiced Rice
Pressure Cooker Beef Stew
Lebanese Falafel Wrap
Duck Confit
Carbonara
Cuban Sandwich
Cajun Shrimp Rice
French Herbed Chicken Rice
Vietnamese Bun Cha
American Classic Pancakes
Japanese Salmon Poke Bowl
Banana Pancakes
Hawaiian Toast
Malaysian Curry Noodles
Fattoush Salad
Seafood Paella
Fufu with Soup
Korean Kimchi Scramble
Chinese Dan Dan Noodles
Southern Biscuits & Gravy
Tamales
Ethiopian Berbere Lentils
Classic Spaghetti Bolognese
Japanese Yakisoba
Quiche Lorraine
Vietnamese Spring Rolls
Chimichanga
Baja Fish Tacos
Linguine with Clams
Bún Riêu
Hummus Bowl
Japanese Teriyaki Salmon
Korean Beef Bowl
Muffins
Spanish Pan con Tomate
Korean BBQ Tacos
Greek Gyro
Granola Bowl
Seafood Marinara
Mediterranean Wrap
Indian Curry Burrito
Italian Mushroom Risotto
Italian Quinoa Salad
Middle Eastern Quinoa
Coffee Cake
Pierogi
Japanese Tamago Sando
Vietnamese Pho
Jamaican Festival Toast
Chinese Hot & Sour Noodles
Soft Tacos
Lebanese Tabbouleh
Cold Somen
Italian Bruschetta
Japanese Soba
Hawaiian Poke Quinoa
Israeli Shakshuka
Farro Bowl
Avocado Toast
Brazilian Pão de Queijo
Cobb Salad
Thai Khao Soi
Brazilian Steak Tacos
Turkish Quinoa Pilaf
Aloo Gobi
Chinese Ginger Scallion Fish
Thai Coconut Noodles
Mujadara
Chocolate Lava Cake
Oatmeal with Berries
Pescado Tacos
Arroz con Pollo
Beef Chow Fun
French Croque Monsieur
Sushi Roll
Amaranth Bowl
Jamaican Jerk Chicken Rice
Japanese Udon
Spherified Mango Salad
Spaghetti Aglio e Olio
California Quinoa Bowl
Spanish Tortilla
Mexican Shrimp Ceviche Rice
Japanese Okonomiyaki
Creamy Chicken Alfredo
Blackened Fish Rice Bowl
French Omelette
Turkish Menemen Toast
Trail Mix Oatmeal
Chilaquiles
Korean Spicy Noodles
Chinese Chow Mein
Goulash
Cajun Quinoa Jambalaya
Turkish Poached Egg Toast
Taquitos
Injera with Lentils
Peruvian Quinoa Bowl
Philly Cheesesteak
Korean Japchae
Thai Peanut Noodles
Red Beans and Rice
Thai Green Curry Rice
Ravioli
Mexican Tostada
Thai Basil Chicken Bowl
Teff Bowl
Vegetarian Lasagna
Greek Salmon Quinoa
Moroccan Sardine Toast
Jamaican Rice & Peas
Gnocchi
Ethiopian Quinoa
Mediterranean Tuna Rice
Mexican Fish Tacos
Mediterranean Quinoa Bowl
Mexican Burrito Bowl
Vietnamese Banh Mi Tacos
Thai Fried Rice
Hawaiian Pancakes
Preserved Lemon Chicken
Naan with Dal
Biryani
Smoothie Bowl
Palak Paneer
Greek Avocado Toast
Hainan Chicken Rice
Mushroom Truffle Pasta
Feijoada
Eggplant Parmesan
Keema and Rice
Instant Pot Chicken and Rice
Southern Red Beans Rice
Japanese Tsukemen
Hash Browns
Mexican Huevos Rancheros
Kofta Kebabs
Lobster Roll
Hawaiian Pork Tacos
Filipino Garlic Chicken Rice
Pesto Pasta
Calzone
Vegan Tofu Scramble
Spanish Rice
Breakfast Bowl
Turkey Sandwich
Pressure Cooker Risotto
Korean Bibimbap Bowl
Kasha Bowl
Tom Yum Soup
Spanish Seafood Rice
Meatball Sub
Sous Vide Salmon
Indian Tandoori Chicken Rice
Tortellini
Empanadas
Moroccan Lamb Tacos
Laksa
Korean Ramyun
Gumbo
Baklava
Dirty Rice
Kale Caesar
Turkish Breakfast Plate
Steak Diane
Crepes
Brazilian Tapioca Crepe
Thai Chicken Wrap
Brazilian Quinoa Bowl
Korean Quinoa Bowl
Nori Wrap
Breakfast Burrito
Borscht
Thai Quinoa Bowl
Caprese Sandwich
Spanish Quinoa
Bananas Foster
Indian Quinoa Biryani
Niçoise Salad
Caribbean Shrimp Tacos
Latkes
French Dip
Spanish Paella
Moroccan Chicken Tagine Rice
Club Sandwich
Buckwheat Bowl
Pelmeni
Thai Tom Yum Noodles
Veggie Burrito
Freekeh Bowl
Peruvian Chicken Tacos
Mexican Quinoa
Tuna Melt
Sous Vide Steak
Lebanese Za'atar Manakish
Sorghum Bowl
Arepas
Indonesian Mie Goreng
Wheatberry Bowl
Cajun Shrimp Tacos
Lemon Salmon Pasta
Beef Jerky
Dutch Baby
Spanish Chorizo Tacos
Arrabbiata
Greek Yogurt Bowl
Turkish Rice Pilaf
Chinese Congee
Cao Lầu
Jackfruit Tacos
Shawarma Plate
Sous Vide Chicken Breast
Indonesian Chicken Tacos
Vietnamese Banh Mi
Turkish Lamb Rice
Jamaican Jerk Chicken Tacos
Corn Chowder
Brazilian Lime Fish Rice
Mediterranean Toast
Kimchi Fried Rice
Jambalaya
Caribbean Coconut Rice
Pozole
Chana Masala
Peruvian Lime Chicken Rice
Indian Chicken Curry Rice
Chinese Sesame Noodles
Caribbean Quinoa
Ethiopian Lentil Tacos
Miso Glazed Salmon
Fresh Bread with Soup
Risotto alla Milanese
Seaweed Salad
Japanese Ramen
Reuben Sandwich
Malaysian Chili Shrimp
Italian Caprese Toast
Pupusas
Baguette Sandwich
Italian Risotto
Ramen with Miso
Grilled Cheese
Waffles
Baked Ziti
Jollof Rice
California Avocado Toast
Penne alla Vodka
Rogan Josh
Vietnamese Lemongrass Tofu Bowl
Quinoa Tabouli
Peruvian Avocado Toast
Egg Salad Sandwich
Shrimp Scampi
Indonesian Fried Rice
Chinese Lo Mein
Mac and Cheese
Nasi Lemak
Ceviche
Butter Chicken
Mee Siam
Al Pastor Tacos
Poutine
Fish and Chips
Mushroom Tacos
Bacon Lettuce Tomato Sandwich
Shrimp Quesadilla
Italian Frittata
Enchiladas
Egusi Soup
French Quinoa Salad
Confit Salmon
Khao Piak Sen
Samosas
Cinnamon Rolls
Millet Bowl
Moroccan Chickpea Rice
Ground Beef Tacos
Chicken Quesadilla
Fresh Pasta
Falafel Bowl
California Burrito
Oatmeal Savory Bowl
Vietnamese Rice Noodle Bowl
Croissant Sandwich
Chia Pudding
Huevos Divorciados
Breakfast Quesadilla
Focaccia
Dried Fruit and Nut Bowl
Japanese Cold Ramen
Vietnamese Bun Bo Hue
Udon Carbonara
Beef Empanadas
Carnitas Tacos
Corned Beef Hash
Crepes Suzette
Hokkien Mee
Slow Cooker Pulled Chicken
Couscous Royale
Grilled Octopus
Strata
Gumbo with Rice
Margherita Pizza
French Onion Soup
Rice and Stew
Ham Sandwich
Ground Turkey Bowl
Pad See Ew
Mee Rebus
Acai Bowl
Nasi Goreng
Yellow Rice
Churros
Dal Makhani
Slow Cooker Dal
Tempeh Bowl
Potato Skins
Polenta from Stone-Ground Corn
Fondue
Cuban Rice Bowl
Dosas
New England Clam Chowder
Tiramisu
Bulgur Pilaf
Coconut Rice with Mango
Korean Egg Toast
Tacos al Pastor
Cauliflower Rice Bowl
Barley Risotto
Polenta Bowl
Cheese Toastie
Flautas
Breakfast Sandwich
Cacio e Pepe
Taco Salad
Schnitzel
Eggs Benedict
Slow Cooker Carnitas
Beef Stroganoff
French Toast
Lemon Rice
Zucchini Noodle Pasta
Wild Rice Bowl`.split('\n').map(s => s.trim()).filter(Boolean)

const currentSet = new Set(currentList)
const missing = [...seedTitles].filter(t => !currentSet.has(t)).sort()

console.log('Seed titles (seed-gallery-meals + seed-gallery-meals-expansion):', seedTitles.size)
console.log('Current list count:', currentList.length)
console.log('\n--- MISSING from current DB (in seed but not in current list) ---\n')
missing.forEach(t => console.log(t))
console.log('\nTotal missing:', missing.length)
