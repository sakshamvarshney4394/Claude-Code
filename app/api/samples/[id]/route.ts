import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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