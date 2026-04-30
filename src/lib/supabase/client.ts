import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Safe fallback to prevent build-time crashes if env vars are missing
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://build-placeholder.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'build-placeholder-key'

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL && typeof window !== 'undefined') {
    console.error('Supabase URL is missing from environment variables.')
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}
