import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getRoleDashboardPath } from '@/lib/types'
import type { UserRole } from '@/lib/types'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const email = user.email || ''

        // Domain validation
        const adminEmails = [
          'bitieeehubadmin1@gmail.com',
          'bitieeehubadmin2@gmail.com',
          'bitieeehubadmin3@gmail.com',
          'bitieeehubadmin4@gmail.com',
        ]

        if (!email.endsWith('@bitsathy.ac.in') && !adminEmails.includes(email)) {
          await supabase.auth.signOut()
          return NextResponse.redirect(`${origin}/login?error=unauthorized_domain`)
        }

        // Bypassing RLS here because Next.js request cookies are not immediately 
        // readable after writing them in the same route handler.
        
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        
        const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey)

        // Look up user in public.users by EMAIL (not id)
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('users')
          .select('role, society_id, profile_completed')
          .eq('email', email)
          .single()

        if (profileError || !profile) {
          console.error("Profile fetch error in callback:", profileError)
          // User is not pre-registered by admin
          await supabase.auth.signOut()
          return NextResponse.redirect(`${origin}/login?error=not_registered`)
        }

        // Profile not completed → send to setup form
        if (!profile.profile_completed) {
          return NextResponse.redirect(`${origin}/profile-setup`)
        }

        // Profile complete → route to role dashboard
        return NextResponse.redirect(
          `${origin}${getRoleDashboardPath(profile.role as UserRole)}`
        )
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
