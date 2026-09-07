import { createClient } from '@supabase/supabase-js'
import { computeSerialMap } from '../lib/sampleNumber.js'
import { groupSamples } from '../lib/groupSamples.js'

const supabaseUrl = 'https://zjorbirihnswldxmpyvt.supabase.co'
const supabaseAnonKey = 'sb_publishable_ID9HdtVCZ7NaF1fEXWOtUw_l9-J-pjY'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verifySession7() {
  console.log('=== SESSION 7 VERIFICATION ===\n')

  // Fetch all active samples from Supabase
  const { data: samples, error } = await supabase
    .from('samples')
    .select(`
      *,
      product:products(*),
      sales_rep:users(*),
      visits:visits(*)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching samples:', error)
    process.exit(1)
  }

  console.log(`Fetched ${samples.length} total underlying samples from DB.`)

  const { serialBySampleId, totalCount } = computeSerialMap(samples)
  const grouped = groupSamples(samples, serialBySampleId, totalCount)

  console.log(`Grouped into ${grouped.length} visual rows.\n`)

  // Check Burger Singh 2026-09-07 group
  const burgerSingh0907 = grouped.find(
    g => g.party_name === 'burger singh' && g.sample_submission_date?.startsWith('2026-09-07')
  )

  if (burgerSingh0907) {
    console.log('✅ Found "burger singh" 2026-09-07 group:')
    console.log('   Sample ID Display:', burgerSingh0907.sample_id_display)
    console.log('   Client Name:', burgerSingh0907.party_name)
    console.log('   Products:', burgerSingh0907.proposed_products_text)
    console.log('   Underlying Rows Count:', burgerSingh0907.samples.length)
    console.log('   Total Visits:', burgerSingh0907.total_visits)
    console.log('   Status:', burgerSingh0907.status)
  } else {
    console.log('ℹ️ No burger singh on 2026-09-07 found.')
  }

  // Check Burger Singh 2026-09-04 group (separate date verification)
  const burgerSingh0904 = grouped.find(
    g => g.party_name === 'burger singh' && g.sample_submission_date?.startsWith('2026-09-04')
  )

  if (burgerSingh0904) {
    console.log('\n✅ Found "burger singh" 2026-09-04 group (separate date):')
    console.log('   Sample ID Display:', burgerSingh0904.sample_id_display)
    console.log('   Products:', burgerSingh0904.proposed_products_text)
    console.log('   Status:', burgerSingh0904.status)
  }

  // Check single-product client (e.g. Haldiram's 2026-08-11 or dfvd 2026-08-06)
  const singleProductGroup = grouped.find(g => g.samples.length === 1)
  if (singleProductGroup) {
    console.log('\n✅ Single-product client example:')
    console.log('   Client Name:', singleProductGroup.party_name)
    console.log('   Sample ID Display:', singleProductGroup.sample_id_display)
    console.log('   Products:', singleProductGroup.proposed_products_text)
    console.log('   Status:', singleProductGroup.status)
    console.log('   Visits:', singleProductGroup.total_visits)
  }

  console.log('\n=== ALL GROUPED ROWS SUMMARY ===')
  grouped.forEach((g, idx) => {
    console.log(
      `${idx + 1}. [${g.sample_id_display}] ${g.party_name} (${g.sample_submission_date?.slice(0, 10)}) - ${g.proposed_products_text} | Status: ${g.status} | Visits: ${g.total_visits} | (${g.samples.length} items)`
    )
  })

  console.log('\n=== VERIFICATION COMPLETE ===')
}

verifySession7()
