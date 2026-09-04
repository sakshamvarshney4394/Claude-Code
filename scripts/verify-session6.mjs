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

function getCategoryForProduct(productName) {
  return PRODUCT_CATALOG.find(c => c.products.includes(productName))?.category
}

async function runVerification() {
  console.log('=== STEP 3: MULTI-COMBINATION VERIFICATION ===\n')

  // Fetch active products from DB (simulating GET /api/products)
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('product_id, product_name, category')
    .is('deleted_at', null)
    .order('product_name')

  if (prodErr) throw prodErr

  // Fetch active sales rep for test
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('user_id, user_name')
    .is('deleted_at', null)
    .limit(1)

  if (userErr || !users.length) throw new Error('No active sales reps found')
  const testRep = users[0]

  // Test combinations
  const testSuites = [
    {
      name: 'Combo 1 (Repro Case): DPC + Creamy Blend',
      selectedNames: ['DPC', 'Creamy Blend'],
      clientName: 'Test Client Repo Case DPC+Creamy'
    },
    {
      name: 'Combo 2 (Cross 4 Categories): Saunth Chutney + Premium Burger Mayo + Chilli Garlic Chutney + Tomato Sauce 1.2kg',
      selectedNames: ['Saunth Chutney', 'Premium Burger Mayo', 'Chilli Garlic Chutney', 'Tomato Sauce 1.2kg'],
      clientName: 'Test Client 4-Category All-Star'
    },
    {
      name: 'Combo 3 (3 Categories): KMC + Cheesy Spread + Pizza Pasta Sauce',
      selectedNames: ['KMC', 'Cheesy Spread', 'Pizza Pasta Sauce'],
      clientName: 'Test Client 3-Category Triplet'
    }
  ]

  const createdSampleIds = []

  for (const suite of testSuites) {
    console.log(`--- Testing: ${suite.name} ---`)

    // 1. Simulate UI checkbox resolution (exact logic in create/page.tsx)
    const product_ids = suite.selectedNames.map(name => {
      const p = products.find(prod => prod.product_name === name)
      if (!p) throw new Error(`Product not found in DB: ${name}`)
      return p.product_id
    })

    console.log('Selected Product IDs:', product_ids)

    // 2. Build rowsToInsert as create/page.tsx does
    const rowsToInsert = product_ids.map(productId => {
      const product = products.find(p => p.product_id === productId)
      const category = product ? (getCategoryForProduct(product.product_name) || product.category || null) : null
      return {
        party_name: suite.clientName,
        category,
        poc_name: 'Test POC',
        poc_contact: '9999999999',
        designation: 'Manager',
        poc_category: 'QSR',
        product_id: productId,
        sample_submission_date: '2026-09-04',
        sales_rep_id: testRep.user_id,
        location: 'Delhi',
        state: 'Delhi',
        next_visit_date: '2026-09-11'
      }
    })

    // 3. Insert into Supabase
    const { data: inserted, error: insertErr } = await supabase
      .from('samples')
      .insert(rowsToInsert)
      .select()

    if (insertErr) throw insertErr

    inserted.forEach(s => createdSampleIds.push(s.sample_id))

    // 4. Query back each sample with joined product (simulating GET /api/samples and GET /api/samples/:id)
    const { data: fetched, error: fetchErr } = await supabase
      .from('samples')
      .select(`
        sample_id,
        party_name,
        product_id,
        product:products(product_id, product_name, category),
        sales_rep:users(user_name)
      `)
      .in('sample_id', inserted.map(s => s.sample_id))

    if (fetchErr) throw fetchErr

    console.log(`Inserted ${inserted.length} rows, fetched ${fetched.length} rows:`)
    let suitePassed = true
    for (let i = 0; i < suite.selectedNames.length; i++) {
      const expectedName = suite.selectedNames[i]
      const matchingRow = fetched.find(r => r.product?.product_name === expectedName)
      if (!matchingRow) {
        suitePassed = false
        console.error(`  ✗ FAILED: Expected product "${expectedName}" not found in fetched rows!`)
      } else {
        console.log(`  ✓ PASSED: Found "${expectedName}" (sample_id: ${matchingRow.sample_id.slice(0, 8)}..., category: ${matchingRow.product?.category})`)
      }
    }

    if (suitePassed && fetched.length === suite.selectedNames.length) {
      console.log(`Result: PASS (exact 1:1 match)\n`)
    } else {
      console.error(`Result: FAIL\n`)
      throw new Error(`Suite ${suite.name} failed verification!`)
    }
  }

  // Cleanup test rows
  console.log(`Cleaning up ${createdSampleIds.length} test sample rows...`)
  const { error: delErr } = await supabase
    .from('samples')
    .delete()
    .in('sample_id', createdSampleIds)

  if (delErr) {
    console.error('Cleanup error:', delErr)
  } else {
    console.log('Test sample rows cleaned up successfully.')
  }

  console.log('\n=== ALL VERIFICATION TESTS PASSED ===')
}

runVerification().catch(console.error)
