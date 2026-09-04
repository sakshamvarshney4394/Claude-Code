import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zjorbirihnswldxmpyvt.supabase.co'
const supabaseAnonKey = 'sb_publishable_ID9HdtVCZ7NaF1fEXWOtUw_l9-J-pjY'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function renameProduct() {
  console.log('Finding active product with name "Saunth"...')
  const { data: target, error: findErr } = await supabase
    .from('products')
    .select('*')
    .eq('product_name', 'Saunth')
    .is('deleted_at', null)

  if (findErr || !target || target.length === 0) {
    console.error('Target product not found:', findErr)
    process.exit(1)
  }

  const productId = target[0].product_id
  console.log(`Found product ${productId}:`, target[0])

  console.log('Updating product_name to "Saunth Chutney"...')
  const { data: updated, error: updateErr } = await supabase
    .from('products')
    .update({ product_name: 'Saunth Chutney', updated_at: new Date().toISOString() })
    .eq('product_id', productId)
    .select()

  if (updateErr) {
    console.error('Update failed:', updateErr)
    process.exit(1)
  }

  console.log('Product updated successfully:', updated)
}

renameProduct()
