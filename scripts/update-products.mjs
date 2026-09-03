import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zjorbirihnswldxmpyvt.supabase.co'
const supabaseAnonKey = 'sb_publishable_ID9HdtVCZ7NaF1fEXWOtUw_l9-J-pjY'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  console.log('1. Soft deleting existing products...')
  const now = new Date().toISOString()
  const { data: updateData, error: updateError } = await supabase
    .from('products')
    .update({ deleted_at: now })
    .is('deleted_at', null)
    .select()

  if (updateError) {
    console.error('Update error:', updateError)
    process.exit(1)
  }
  console.log(`Soft-deleted ${updateData?.length ?? 0} existing products.`)

  const newProducts = [
    // Indian Chutney
    { product_name: 'KMC', category: 'Indian Chutney' },
    { product_name: 'DPC', category: 'Indian Chutney' },
    { product_name: 'Date and Tamarind', category: 'Indian Chutney' },
    { product_name: 'Saunth', category: 'Indian Chutney' },
    // Mayonnaise
    { product_name: 'Premium Burger Mayo', category: 'Mayonnaise' },
    { product_name: 'Cheesy Spread', category: 'Mayonnaise' },
    { product_name: 'Cheese Blend', category: 'Mayonnaise' },
    { product_name: 'Creamy Blend', category: 'Mayonnaise' },
    // Hot Sauces
    { product_name: 'Pizza Pasta Sauce', category: 'Hot Sauces' },
    { product_name: 'Momo Chutney', category: 'Hot Sauces' },
    { product_name: 'Chilli Garlic Chutney', category: 'Hot Sauces' },
    // Tomato Products
    { product_name: 'Tomato Ketchup 8g Pouch', category: 'Tomato Products' },
    { product_name: 'Tomato Ketchup 1kg', category: 'Tomato Products' },
    { product_name: 'Tomato Sauce 8g', category: 'Tomato Products' },
    { product_name: 'Tomato Sauce 1.2kg', category: 'Tomato Products' },
  ]

  console.log(`2. Inserting ${newProducts.length} new products...`)
  const { data: insertData, error: insertError } = await supabase
    .from('products')
    .insert(newProducts)
    .select()

  if (insertError) {
    console.error('Insert error:', insertError)
    process.exit(1)
  }

  console.log(`Successfully inserted ${insertData?.length} new products:`)
  insertData.forEach(p => console.log(`- [${p.category}] ${p.product_name} (${p.product_id})`))
}

run()
