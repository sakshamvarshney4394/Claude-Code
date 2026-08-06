// One-off generator: reads lib/catalog.ts and emits supabase/seed_products.sql
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(__dirname, '..', 'lib', 'catalog.ts'), 'utf8')

// Grab the PRODUCT_CATALOG array literal (between the const line and the flat-list comment).
const match = src.match(/PRODUCT_CATALOG:\s*CatalogCategory\[\]\s*=\s*([\s\S]+?)\n\/\/ Flat list/)
if (!match) throw new Error('could not parse catalog.ts')
const catalog = eval(`(${match[1]})`) // safe: pure literal, our own file

const creates = catalog.map(({ category }) => `  -- category: ${category}`)

const inserts = []
for (const { category, products } of catalog) {
  for (const product of products) {
    const safe = product.replace(/'/g, "''")
    inserts.push(`INSERT INTO public.products (product_name, category) VALUES ('${safe}', '${category}');`)
  }
}

const sql = `-- Generated 2026-08-06 from lib/catalog.ts -- do not hand-edit; regenerate via scripts/generate_seed.mjs

-- 1) Products now carry their category (so the create form & joins can resolve it).
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category TEXT;

-- 2) Start the products table fresh.
TRUNCATE public.products;

-- 3) Seed one row per catalog product. product_id auto-generates as a real UUID.
${inserts.join('\n')}

SELECT count(*) AS seeded_products FROM public.products;
`

const dest = join(__dirname, '..', 'supabase', 'seed_products.sql')
mkdirSync(dirname(dest), { recursive: true })
writeFileSync(dest, sql, 'utf8')
console.log(`Wrote ${dest}`)
console.log(`${inserts.length} product rows generated.`)