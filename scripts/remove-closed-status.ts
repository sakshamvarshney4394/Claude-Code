import { createClient } from '@supabase/supabase-js'

// Use environment variables directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zjorbirihnswldxmpyvt.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ID9HdtVCZ7NaF1fEXWOtUw_l9-J-pjY'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function removeClosedStatus() {
  console.log('=== Starting Closed Status Removal Process ===\n')

  try {
    // Step 1: Report current counts
    console.log('Step 1: Reporting current counts...')

    const { data: closedSamples, error: closedError } = await supabase
      .from('samples')
      .select('sample_id')
      .eq('output', 'Closed')

    if (closedError) throw closedError

    const closedSampleIds = closedSamples?.map(s => s.sample_id) || []
    console.log(`- Samples with output = 'Closed': ${closedSampleIds.length}`)

    let visitsCount = 0
    if (closedSampleIds.length > 0) {
      const { data: visits, error: visitsError } = await supabase
        .from('visits')
        .select('visit_id')
        .in('sample_id', closedSampleIds)

      if (visitsError) throw visitsError
      visitsCount = visits?.length || 0
    }
    console.log(`- Visits belonging to those samples: ${visitsCount}\n`)

    // Step 2 & 3: Delete visits and samples
    if (closedSampleIds.length > 0) {
      console.log('Step 2: Deleting visits...')
      const { error: deleteVisitsError } = await supabase
        .from('visits')
        .delete()
        .in('sample_id', closedSampleIds)

      if (deleteVisitsError) throw deleteVisitsError
      console.log(`- Deleted ${visitsCount} visit(s)\n`)

      console.log('Step 3: Deleting samples with output = "Closed"...')
      const { error: deleteSamplesError } = await supabase
        .from('samples')
        .delete()
        .eq('output', 'Closed')

      if (deleteSamplesError) throw deleteSamplesError
      console.log(`- Deleted ${closedSampleIds.length} sample(s)\n`)
    } else {
      console.log('Step 2 & 3: No samples with output = "Closed" to delete\n')
    }

    // Report final counts
    console.log('Final row counts after deletion:')
    const { count: finalSamplesCount } = await supabase
      .from('samples')
      .select('*', { count: 'exact', head: true })

    const { count: finalVisitsCount } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })

    console.log(`- Total samples remaining: ${finalSamplesCount}`)
    console.log(`- Total visits remaining: ${finalVisitsCount}\n`)

    console.log('Step 4: Altering CHECK constraint...')
    console.log('Note: CHECK constraint modification requires direct database access.')
    console.log('Run this SQL command in Supabase SQL Editor:')
    console.log(`
ALTER TABLE samples
DROP CONSTRAINT IF EXISTS samples_output_check;

ALTER TABLE samples
ADD CONSTRAINT samples_output_check
CHECK (output IN ('Pending', 'Onboard', 'Not Interested', 'Interested but need time'));
`)

    console.log('\n=== Database operations completed successfully ===')
    console.log('\nNext: Run the codebase changes to remove "Closed" from all code references.')

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

removeClosedStatus()
