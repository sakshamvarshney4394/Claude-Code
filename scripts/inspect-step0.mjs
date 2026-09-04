import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zjorbirihnswldxmpyvt.supabase.co'
const supabaseAnonKey = 'sb_publishable_ID9HdtVCZ7NaF1fEXWOtUw_l9-J-pjY'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function inspect() {
  console.log('--- SAMPLES TABLE ---')
  const { data: samples, error: samplesErr } = await supabase
    .from('samples')
    .select('*')
  if (samplesErr) {
    console.error('Samples error:', samplesErr)
  } else {
    console.log(`Total samples in DB: ${samples.length}`)
    if (samples.length > 0) {
      console.log('Sample columns:', Object.keys(samples[0]))
      const userSampleCounts = {}
      samples.forEach(s => {
        userSampleCounts[s.sales_rep_id] = (userSampleCounts[s.sales_rep_id] || 0) + 1
      })
      console.log('Sample count per sales_rep_id:', userSampleCounts)
      console.table(samples.map(s => ({
        id: s.id || s.sample_id,
        sales_rep_id: s.sales_rep_id,
        business_name: s.business_name,
        created_at: s.created_at,
        deleted_at: s.deleted_at
      })))
    }
  }
}

inspect()
