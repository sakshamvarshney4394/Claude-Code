import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/products — the product catalog, seeded from lib/catalog.ts.
// The create form loads these so the dropdown submits real product_id UUIDs.
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('product_id, product_name, category')
      .is('deleted_at', null)
      .order('product_name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
