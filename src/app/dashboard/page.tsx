import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getRoleDashboardPath } from '@/lib/types'
import type { UserRole } from '@/lib/types'

export default async function DashboardRedirect() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) redirect('/login')

  // Lookup by email — handles admin pre-populated rows
  const { data: profile } = await supabase
    .from('users')
    .select('role, profile_completed')
    .eq('email', user.email)
    .single()

  if (!profile) redirect('/login?error=not_registered')

  // Check profile completion
  if (!profile.profile_completed) {
    redirect('/profile-setup')
  }

  redirect(getRoleDashboardPath(profile.role as UserRole))
}
