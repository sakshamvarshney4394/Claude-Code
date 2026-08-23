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
      .is('deleted_at', null)
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
        // poc_category added with the POC Category field (nullable TEXT column).
        poc_category: body.poc_category || null,
        product_id: body.product_id,
        sample_submission_date: body.sample_submission_date,
        // sales_rep_id is nullable until auth ships (Step 5 adds the dropdown).
        sales_rep_id: body.sales_rep_id || null,
        location: body.location || null,
        // state added with the State dropdown feature (nullable TEXT column).
        state: body.state || null,
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
    // Delete visits first due to foreign key constraint: visits.sample_id references samples.sample_id
    const { error: visitsError, count: visitsCount } = await supabase
      .from('visits')
      .delete()

    if (visitsError) {
      return NextResponse.json(
        { error: visitsError.message },
        { status: 500 }
      )
    }

    // Then delete all samples
    const { error: samplesError, count: samplesCount } = await supabase
      .from('samples')
      .delete()

    if (samplesError) {
      return NextResponse.json(
        { error: samplesError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ deleted: samplesCount }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}

// Bulk delete-all endpoint REMOVED — it could wipe the entire database with one call.
// Single-sample deletion is available at DELETE /api/samples/:id