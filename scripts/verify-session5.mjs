import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(__dirname, '..', 'lib', 'catalog.ts'), 'utf8')
const match = src.match(/PRODUCT_CATALOG:\s*CatalogCategory\[\]\s*=\s*([\s\S]+?)\n\/\/ Flat list/)
const PRODUCT_CATALOG = eval(`(${match[1]})`)

const supabaseUrl = 'https://zjorbirihnswldxmpyvt.supabase.co'
const supabaseAnonKey = 'sb_publishable_ID9HdtVCZ7NaF1fEXWOtUw_l9-J-pjY'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verify() {
  console.log('=== 1. VERIFY PRODUCTS (Create Form Checkbox Source) ===')
  const { data: activeProducts, error: prodErr } = await supabase
    .from('products')
    .select('product_id, product_name, category')
    .is('deleted_at', null)
    .order('product_name')

  if (prodErr) throw prodErr

  console.log(`Active products count: ${activeProducts.length}`)
  const productNames = activeProducts.map(p => p.product_name)
  console.log('Product names in DB:', productNames)

  const hasSaunthChutney = productNames.includes('Saunth Chutney')
  const hasOldSaunth = productNames.includes('Saunth')
  console.log(`Contains 'Saunth Chutney': ${hasSaunthChutney}`)
  console.log(`Contains exact 'Saunth': ${hasOldSaunth}`)

  // Verify catalog matching
  for (const cat of PRODUCT_CATALOG) {
    console.log(`\nCatalog Category: [${cat.category}]`)
    for (const prodName of cat.products) {
      const match = activeProducts.find(p => p.product_name === prodName)
      if (match) {
        console.log(`  ✓ ${prodName} (id: ${match.product_id})`)
      } else {
        console.error(`  ✗ MISSING FROM DB: ${prodName}`)
      }
    }
  }

  console.log('\n=== 2. VERIFY SALES REPS (Create Form Dropdown Source) ===')
  const { data: activeReps, error: repErr } = await supabase
    .from('users')
    .select('user_id, user_name, role')
    .is('deleted_at', null)
    .order('user_name')

  if (repErr) throw repErr

  console.log(`Active reps count: ${activeReps.length}`)
  console.table(activeReps)

  const expectedReps = ['Jatin', 'Manish', 'Shantanu', 'Udit', 'Vikas']
  const actualReps = activeReps.map(r => r.user_name).sort()
  const repsMatch = JSON.stringify(actualReps) === JSON.stringify(expectedReps)
  console.log(`Reps match expected [${expectedReps.join(', ')}]: ${repsMatch}`)

  console.log('\n=== 3. VERIFY SAMPLES WITH SOFT-DELETED REPS (Detail View Source) ===')
  const { data: samples, error: sampleErr } = await supabase
    .from('samples')
    .select(`
      sample_id,
      party_name,
      sales_rep_id,
      sales_rep:users(user_id, user_name, deleted_at)
    `)
    .is('deleted_at', null)

  if (sampleErr) throw sampleErr

  console.log(`Active samples count: ${samples.length}`)
  let allRepsResolved = true
  for (const s of samples) {
    const repName = s.sales_rep?.user_name
    const isSoftDeleted = s.sales_rep?.deleted_at !== null
    if (!repName) {
      allRepsResolved = false
      console.error(`  ✗ Sample ${s.sample_id} (${s.party_name}): sales_rep is NULL!`)
    } else {
      console.log(`  ✓ Sample ${s.sample_id.slice(0, 8)}... (${s.party_name}): sales_rep = "${repName}" (soft-deleted: ${isSoftDeleted})`)
    }
  }

  console.log(`\nAll sample sales reps resolved properly: ${allRepsResolved}`)
}

verify().catch(console.error)
