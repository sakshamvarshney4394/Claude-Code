import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/samples/:id — fetch one sample with its joined product, sales rep, and visits.
// The product:products(*) and sales_rep:users(*) relations resolve because product_id /
// sales_rep_id hold real UUIDs that match seeded rows (see STATUS.md Step 2).
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const { data, error } = await supabase
      .from('samples')
      .select(`
        *,
        product:products(*),
        sales_rep:users(*),
        visits:visits(*)
      `)
      .eq('sample_id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Sample not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()

    // Validate output field
    const validOutputs = ['Pending', 'Closed', 'Onboard', 'Not Interested', 'Interested but need time']
    if (!body.output || !validOutputs.includes(body.output)) {
      return NextResponse.json(
        { error: 'Valid output status is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('samples')
      .update({
        output: body.output,
        // Automatically set next_visit_date to null when outcome is final
        next_visit_date:
          body.output === 'Onboard' ||
          body.output === 'Closed' ||
          body.output === 'Not Interested'
            ? null
            : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('sample_id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Sample not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/samples/:id — full-field update from the Edit page. Updates only the
// samples row (all editable fields, including output/status). Follow-up visits are
// deliberately NOT touched here — visit management stays on the detail page.
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()

    // Validate required fields — same rules as create (POST /api/samples).
    const requiredFields = ['party_name', 'product_id', 'sample_submission_date']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        )
      }
    }

    // Validate output/status against the known set (mirrors the PUT handler).
    const validOutputs = ['Pending', 'Closed', 'Onboard', 'Not Interested', 'Interested but need time']
    if (!body.output || !validOutputs.includes(body.output)) {
      return NextResponse.json(
        { error: 'Valid output status is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('samples')
      .update({
        party_name: body.party_name,
        category: body.category || null,
        poc_name: body.poc_name || null,
        poc_contact: body.poc_contact || null,
        designation: body.designation || null,
        poc_category: body.poc_category || null,
        product_id: body.product_id,
        sample_submission_date: body.sample_submission_date,
        sales_rep_id: body.sales_rep_id || null,
        location: body.location || null,
        state: body.state || null,
        next_visit_date: body.next_visit_date || null,
        output: body.output,
        updated_at: new Date().toISOString()
      })
      .eq('sample_id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Sample not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/samples/:id — delete one sample and its visit history.
// Visits carry an FK to samples (no ON DELETE CASCADE in the schema), so visits
// must be deleted first, then the sample, to avoid orphaned rows / FK violations.
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    // 1) Delete this sample's visits first (FK: visits.sample_id -> samples.sample_id).
    const { error: visitsError } = await supabase
      .from('visits')
      .delete()
      .eq('sample_id', id)

    if (visitsError) {
      return NextResponse.json(
        { error: `Failed to delete visits: ${visitsError.message}` },
        { status: 500 }
      )
    }

    // 2) Delete the sample itself.
    const { error: sampleError } = await supabase
      .from('samples')
      .delete()
      .eq('sample_id', id)

    if (sampleError) {
      return NextResponse.json(
        { error: `Failed to delete sample: ${sampleError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ deleted: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
