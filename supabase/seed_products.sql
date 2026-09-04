-- Generated 2026-08-06 from lib/catalog.ts -- do not hand-edit; regenerate via scripts/generate_seed.mjs

-- 1) Products now carry their category (so the create form & joins can resolve it).
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category TEXT;

-- 2) Start the products table fresh.
TRUNCATE public.products;

-- 3) Seed one row per catalog product. product_id auto-generates as a real UUID.
INSERT INTO public.products (product_name, category) VALUES ('KMC', 'Indian Chutney');
INSERT INTO public.products (product_name, category) VALUES ('DPC', 'Indian Chutney');
INSERT INTO public.products (product_name, category) VALUES ('Date and Tamarind', 'Indian Chutney');
INSERT INTO public.products (product_name, category) VALUES ('Saunth Chutney', 'Indian Chutney');
INSERT INTO public.products (product_name, category) VALUES ('Premium Burger Mayo', 'Mayonnaise');
INSERT INTO public.products (product_name, category) VALUES ('Cheesy Spread', 'Mayonnaise');
INSERT INTO public.products (product_name, category) VALUES ('Cheese Blend', 'Mayonnaise');
INSERT INTO public.products (product_name, category) VALUES ('Creamy Blend', 'Mayonnaise');
INSERT INTO public.products (product_name, category) VALUES ('Pizza Pasta Sauce', 'Hot Sauces');
INSERT INTO public.products (product_name, category) VALUES ('Momo Chutney', 'Hot Sauces');
INSERT INTO public.products (product_name, category) VALUES ('Chilli Garlic Chutney', 'Hot Sauces');
INSERT INTO public.products (product_name, category) VALUES ('Tomato Ketchup 8g Pouch', 'Tomato Products');
INSERT INTO public.products (product_name, category) VALUES ('Tomato Ketchup 1kg', 'Tomato Products');
INSERT INTO public.products (product_name, category) VALUES ('Tomato Sauce 8g', 'Tomato Products');
INSERT INTO public.products (product_name, category) VALUES ('Tomato Sauce 1.2kg', 'Tomato Products');

SELECT count(*) AS seeded_products FROM public.products;
