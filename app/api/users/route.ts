import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/users — list of sales reps for the create-form dropdown.
// PRE-AUTH: each rep will get their own account in v2; until then the `users`
// table is just seeded rep identities and the form stores sales_rep_id manually.
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_id, user_name, role')
      .is('deleted_at', null)
      .order('user_name')

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
