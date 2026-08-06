import { redirect } from 'next/navigation'

// The app's natural entry point is the sample list — the home route redirects there.
export default function Page() {
  redirect('/samples')
}
