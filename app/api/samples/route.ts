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

    // Validate required fields. NOTE: sales_rep_id is intentionally NOT required yet —
    // auth is deferred to v2, and the create form adds a rep via a dropdown in Step 5.
    const requiredFields = ['party_name', 'product_id', 'sample_submission_date']
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
        // sales_rep_id is nullable until auth ships (Step 5 adds the dropdown).
        sales_rep_id: body.sales_rep_id || null,
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

export async function DELETE(request: NextRequest) {
  try {
    // First delete all visits (due to FK constraint: visits.sample_id references samples.sample_id)
    const { error: visitsError } = await supabase
      .from('visits')
      .delete()
      .not('sample_id', 'is', null)

    if (visitsError) {
      return NextResponse.json(
        { error: `Failed to delete visits: ${visitsError.message}` },
        { status: 500 }
      )
    }

    // Then delete all samples
    const { error: samplesError } = await supabase
      .from('samples')
      .delete()
      .not('sample_id', 'is', null)

    if (samplesError) {
      return NextResponse.json(
        { error: `Failed to delete samples: ${samplesError.message}` },
        { status: 500 }
      )
    }

    // Return success message (exact count not critical for this operation)
    return NextResponse.json({ deleted: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}