import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zjorbirihnswldxmpyvt.supabase.co'
const supabaseAnonKey = 'sb_publishable_ID9HdtVCZ7NaF1fEXWOtUw_l9-J-pjY'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error(error)
    return
  }

  console.log(`Total products: ${data.length}`)
  console.table(data)
}

checkProducts()
