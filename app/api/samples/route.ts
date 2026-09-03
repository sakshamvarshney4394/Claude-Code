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

    let rowsToInsert: any[] = []

    if (Array.isArray(body)) {
      rowsToInsert = body
    } else if (Array.isArray(body.samples)) {
      // Multiple sample items with shared client fields
      const {
        party_name,
        poc_name,
        poc_contact,
        designation,
        poc_category,
        sales_rep_id,
        location,
        state,
      } = body

      rowsToInsert = body.samples.map((s: any) => ({
        party_name: s.party_name ?? party_name,
        category: s.category ?? null,
        poc_name: s.poc_name ?? poc_name ?? null,
        poc_contact: s.poc_contact ?? poc_contact ?? null,
        designation: s.designation ?? designation ?? null,
        poc_category: s.poc_category ?? poc_category ?? null,
        product_id: s.product_id,
        sample_submission_date: s.sample_submission_date,
        sales_rep_id: s.sales_rep_id ?? sales_rep_id ?? null,
        location: s.location ?? location ?? null,
        state: s.state ?? state ?? null,
        next_visit_date: s.next_visit_date ?? null,
      }))
    } else if (Array.isArray(body.product_ids)) {
      // Array of product_ids with shared fields
      const {
        party_name,
        category,
        categories,
        poc_name,
        poc_contact,
        designation,
        poc_category,
        sample_submission_date,
        sales_rep_id,
        location,
        state,
        next_visit_date,
      } = body

      rowsToInsert = body.product_ids.map((pid: string, idx: number) => ({
        party_name,
        category: (Array.isArray(categories) ? categories[idx] : category) || null,
        poc_name: poc_name || null,
        poc_contact: poc_contact || null,
        designation: designation || null,
        poc_category: poc_category || null,
        product_id: pid,
        sample_submission_date,
        sales_rep_id: sales_rep_id || null,
        location: location || null,
        state: state || null,
        next_visit_date: next_visit_date || null,
      }))
    } else {
      // Single sample object
      rowsToInsert = [{
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
      }]
    }

    if (rowsToInsert.length === 0) {
      return NextResponse.json({ error: 'At least one product is required' }, { status: 400 })
    }

    // Validate required fields for every row
    for (const row of rowsToInsert) {
      if (!row.party_name) {
        return NextResponse.json({ error: 'party_name is required' }, { status: 400 })
      }
      if (!row.product_id) {
        return NextResponse.json({ error: 'product_id is required' }, { status: 400 })
      }
      if (!row.sample_submission_date) {
        return NextResponse.json({ error: 'sample_submission_date is required' }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from('samples')
      .insert(rowsToInsert)
      .select()

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

export async function DELETE() {
  try {
    // Step 1: Delete all visits first (FK: visits.sample_id → samples.sample_id)
    const { error: visitsError, count: visitsDeleted } = await supabase
      .from('visits')
      .delete()
      .neq('visit_id', '00000000-0000-0000-0000-000000000000')

    if (visitsError) {
      return NextResponse.json({ error: visitsError.message }, { status: 500 })
    }

    // Step 2: Delete all samples
    const { error: samplesError, count: samplesDeleted } = await supabase
      .from('samples')
      .delete()
      .neq('sample_id', '00000000-0000-0000-0000-000000000000')

    if (samplesError) {
      return NextResponse.json({ error: samplesError.message }, { status: 500 })
    }

    return NextResponse.json({ deleted: samplesDeleted ?? 0 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
