import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zjorbirihnswldxmpyvt.supabase.co'
const supabaseAnonKey = 'sb_publishable_ID9HdtVCZ7NaF1fEXWOtUw_l9-J-pjY'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function inspectSamples() {
  const { data: samples, error } = await supabase
    .from('samples')
    .select(`
      sample_id,
      party_name,
      product_id,
      product:products(product_id, product_name, category),
      sales_rep:users(user_name),
      sample_submission_date,
      created_at
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    return
  }

  console.log(`Total samples: ${samples.length}`)
  console.table(samples.map(s => ({
    id: s.sample_id.slice(0, 8),
    client: s.party_name,
    product_name: s.product?.product_name,
    product_category: s.product?.category,
    product_id: s.product_id,
    created_at: s.created_at
  })))
}

inspectSamples()
