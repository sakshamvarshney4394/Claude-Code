import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zjorbirihnswldxmpyvt.supabase.co'
const supabaseAnonKey = 'sb_publishable_ID9HdtVCZ7NaF1fEXWOtUw_l9-J-pjY'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function replaceSalesReps() {
  console.log('1. Soft-deleting existing users...')
  const now = new Date().toISOString()
  const { data: softDeleted, error: deleteErr } = await supabase
    .from('users')
    .update({ deleted_at: now })
    .is('deleted_at', null)
    .select()

  if (deleteErr) {
    console.error('Soft delete error:', deleteErr)
    process.exit(1)
  }
  console.log(`Soft-deleted ${softDeleted?.length ?? 0} existing users:`)
  console.table(softDeleted)

  console.log('\n2. Inserting 5 new sales reps...')
  const newReps = [
    { user_name: 'Manish' },
    { user_name: 'Vikas' },
    { user_name: 'Udit' },
    { user_name: 'Shantanu' },
    { user_name: 'Jatin' }
  ]

  const { data: inserted, error: insertErr } = await supabase
    .from('users')
    .insert(newReps)
    .select()

  if (insertErr) {
    console.error('Insert error:', insertErr)
    process.exit(1)
  }

  console.log(`Successfully inserted ${inserted?.length ?? 0} new sales reps:`)
  console.table(inserted)

  console.log('\n3. Verifying active users (deleted_at IS NULL)...')
  const { data: activeUsers, error: activeErr } = await supabase
    .from('users')
    .select('user_id, user_name, role, deleted_at')
    .is('deleted_at', null)
    .order('user_name')

  if (activeErr) {
    console.error('Active users query error:', activeErr)
    process.exit(1)
  }
  console.log(`Active user count: ${activeUsers.length}`)
  console.table(activeUsers)

  console.log('\n4. Verifying total users in table (including soft-deleted)...')
  const { data: allUsers, error: allErr } = await supabase
    .from('users')
    .select('user_id, user_name, role, deleted_at')
    .order('created_at')

  if (allErr) {
    console.error('All users query error:', allErr)
    process.exit(1)
  }
  console.log(`Total user count: ${allUsers.length}`)
  console.table(allUsers)
}

replaceSalesReps()
