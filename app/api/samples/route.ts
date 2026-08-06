import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('samples')
      .select(`
        *,
        product:products(*),
        sales_rep:users(*),
        visits:visits(*)
      `)
      .order('created_at', { ascending: false })

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const requiredFields = ['party_name', 'product_id', 'sample_submission_date', 'sales_rep_id']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabase
      .from('samples')
      .insert({
        party_name: body.party_name,
        category: body.category || null,
        poc_name: body.poc_name || null,
        poc_contact: body.poc_contact || null,
        designation: body.designation || null,
        product_id: body.product_id,
        sample_submission_date: body.sample_submission_date,
        sales_rep_id: body.sales_rep_id,
        location: body.location || null,
        // output defaults to 'Pending' per specification
        next_visit_date: body.next_visit_date || null
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}