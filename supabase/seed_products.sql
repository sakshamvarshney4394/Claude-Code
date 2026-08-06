-- Generated 2026-08-06 from lib/catalog.ts -- do not hand-edit; regenerate via scripts/generate_seed.mjs

-- 1) Products now carry their category (so the create form & joins can resolve it).
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category TEXT;

-- 2) Start the products table fresh.
TRUNCATE public.products;

-- 3) Seed one row per catalog product. product_id auto-generates as a real UUID.
INSERT INTO public.products (product_name, category) VALUES ('Tamarind Chutney', 'Indian Chutneys');
INSERT INTO public.products (product_name, category) VALUES ('Saunth Chutney (Khatti Meethi Chutney)', 'Indian Chutneys');
INSERT INTO public.products (product_name, category) VALUES ('Dhaniya Pudina Chutney', 'Indian Chutneys');
INSERT INTO public.products (product_name, category) VALUES ('Date & Tamarind Chutney', 'Indian Chutneys');
INSERT INTO public.products (product_name, category) VALUES ('Bhelpuri Chutney', 'Indian Chutneys');
INSERT INTO public.products (product_name, category) VALUES ('Samosa Chutney', 'Indian Chutneys');
INSERT INTO public.products (product_name, category) VALUES ('Delhi Ki Chaat Chutney', 'Indian Chutneys');
INSERT INTO public.products (product_name, category) VALUES ('Coriander Chutney', 'Indian Chutneys');
INSERT INTO public.products (product_name, category) VALUES ('Mint Chutney', 'Indian Chutneys');
INSERT INTO public.products (product_name, category) VALUES ('Garlic Chutney', 'Indian Chutneys');
INSERT INTO public.products (product_name, category) VALUES ('Tamarind Sauce', 'Indian Chutneys');
INSERT INTO public.products (product_name, category) VALUES ('Hot Mango Chutney', 'Mango Chutneys');
INSERT INTO public.products (product_name, category) VALUES ('Mango Lime Chutney', 'Mango Chutneys');
INSERT INTO public.products (product_name, category) VALUES ('Mango Chilli Chutney', 'Mango Chutneys');
INSERT INTO public.products (product_name, category) VALUES ('Mango Ginger Chutney', 'Mango Chutneys');
INSERT INTO public.products (product_name, category) VALUES ('Mango Sweet & Tangy Chutney', 'Mango Chutneys');
INSERT INTO public.products (product_name, category) VALUES ('Sweet Chilli Sauce', 'Chinese Sauces');
INSERT INTO public.products (product_name, category) VALUES ('Honey Chilli Sauce', 'Chinese Sauces');
INSERT INTO public.products (product_name, category) VALUES ('Green Chilli Sauce', 'Chinese Sauces');
INSERT INTO public.products (product_name, category) VALUES ('Chilli Garlic Sauce', 'Chinese Sauces');
INSERT INTO public.products (product_name, category) VALUES ('Red Chilli Sauce', 'Chinese Sauces');
INSERT INTO public.products (product_name, category) VALUES ('Soya Sauce', 'Chinese Sauces');
INSERT INTO public.products (product_name, category) VALUES ('Vinegar', 'Chinese Sauces');
INSERT INTO public.products (product_name, category) VALUES ('Schezwan Sauce', 'Schezwan Range');
INSERT INTO public.products (product_name, category) VALUES ('Hot Schezwan Sauce', 'Schezwan Range');
INSERT INTO public.products (product_name, category) VALUES ('Schezwan Chutney', 'Schezwan Range');
INSERT INTO public.products (product_name, category) VALUES ('Momo Sauce', 'Momo Range');
INSERT INTO public.products (product_name, category) VALUES ('Momo Chutney', 'Momo Range');
INSERT INTO public.products (product_name, category) VALUES ('Hot Green Jalapeño Sauce', 'Hot Sauces');
INSERT INTO public.products (product_name, category) VALUES ('Hot Garlic Jalapeño Sauce', 'Hot Sauces');
INSERT INTO public.products (product_name, category) VALUES ('Hot Onion Jalapeño Sauce', 'Hot Sauces');
INSERT INTO public.products (product_name, category) VALUES ('Mango Ghost Pepper Hot Sauce', 'Hot Sauces');
INSERT INTO public.products (product_name, category) VALUES ('Hot Peaches Sauce', 'Hot Sauces');
INSERT INTO public.products (product_name, category) VALUES ('Pineapple Green Chilli Sauce', 'Hot Sauces');
INSERT INTO public.products (product_name, category) VALUES ('Italian Pizza Sauce', 'Pizza & Pasta Sauces');
INSERT INTO public.products (product_name, category) VALUES ('Pizza Pasta Sauce', 'Pizza & Pasta Sauces');
INSERT INTO public.products (product_name, category) VALUES ('Pizza Pasta Herb Sauce', 'Pizza & Pasta Sauces');
INSERT INTO public.products (product_name, category) VALUES ('Hot Pizza Pasta Sauce', 'Pizza & Pasta Sauces');
INSERT INTO public.products (product_name, category) VALUES ('Tomato Ketchup', 'Tomato Products');
INSERT INTO public.products (product_name, category) VALUES ('Tomato Sauce', 'Tomato Products');
INSERT INTO public.products (product_name, category) VALUES ('Snack Dressing', 'Tomato Products');
INSERT INTO public.products (product_name, category) VALUES ('Tomato Paste', 'Tomato Products');
INSERT INTO public.products (product_name, category) VALUES ('Tomato Puree', 'Tomato Products');
INSERT INTO public.products (product_name, category) VALUES ('Tomato Soup', 'Tomato Products');
INSERT INTO public.products (product_name, category) VALUES ('Tomato Makhani Gravy', 'Ready-to-Use Gravies');
INSERT INTO public.products (product_name, category) VALUES ('White Gravy', 'Ready-to-Use Gravies');
INSERT INTO public.products (product_name, category) VALUES ('Yellow Gravy', 'Ready-to-Use Gravies');
INSERT INTO public.products (product_name, category) VALUES ('Brown Gravy', 'Ready-to-Use Gravies');
INSERT INTO public.products (product_name, category) VALUES ('Onion Tomato Gravy', 'Ready-to-Use Gravies');
INSERT INTO public.products (product_name, category) VALUES ('Bhuna Masala', 'Ready-to-Use Gravies');
INSERT INTO public.products (product_name, category) VALUES ('Tandoori Marinade', 'Marinades');
INSERT INTO public.products (product_name, category) VALUES ('Reshmi Kebab Marinade', 'Marinades');
INSERT INTO public.products (product_name, category) VALUES ('Kalami Kebab Marinade', 'Marinades');
INSERT INTO public.products (product_name, category) VALUES ('Mayonnaise', 'Mayonnaise');
INSERT INTO public.products (product_name, category) VALUES ('Jalapeño Mayonnaise', 'Mayonnaise');
INSERT INTO public.products (product_name, category) VALUES ('Piri Piri Mayonnaise', 'Mayonnaise');
INSERT INTO public.products (product_name, category) VALUES ('Makhani Gravy Mayo', 'Mayonnaise');
INSERT INTO public.products (product_name, category) VALUES ('Thousand Island Dressing', 'Dressings');
INSERT INTO public.products (product_name, category) VALUES ('Harissa Chilli Cumin Dressing', 'Dressings');
INSERT INTO public.products (product_name, category) VALUES ('Chipotle Dressing', 'Dressings');
INSERT INTO public.products (product_name, category) VALUES ('Cheese Blend', 'Cheese Blends / Spreads');
INSERT INTO public.products (product_name, category) VALUES ('Chilli Cheese Blend', 'Cheese Blends / Spreads');
INSERT INTO public.products (product_name, category) VALUES ('Tamarind Slab (100% Seedless)', 'Tamarind Products');
INSERT INTO public.products (product_name, category) VALUES ('Soft Tamarind (100% Seedless)', 'Tamarind Products');
INSERT INTO public.products (product_name, category) VALUES ('Tamarind Paste', 'Tamarind Products');

SELECT count(*) AS seeded_products FROM public.products;
