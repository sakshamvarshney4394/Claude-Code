import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const requiredFields = ['sample_id', 'visit_date']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        )
      }
    }

    // First get the highest visit number for this sample
    const { data: visitCountData, error: countError } = await supabase
      .from('visits')
      .select('visit_number')
      .eq('sample_id', body.sample_id)
      .order('visit_number', { ascending: false })
      .limit(1)

    if (countError) {
      return NextResponse.json(
        { error: countError.message },
        { status: 500 }
      )
    }

    const highestVisitNumber = visitCountData[0]?.visit_number ?? 0
    const nextVisitNumber = parseInt(highestVisitNumber.toString()) + 1

    const { data, error } = await supabase
      .from('visits')
      .insert({
        sample_id: body.sample_id,
        visit_date: body.visit_date,
        feedback: body.feedback || null,
        visit_number: nextVisitNumber
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