import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export default async function HomePage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (data?.claims) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl font-mono text-xl font-bold text-white"
          style={{ background: 'var(--accent)' }}
        >
          L
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">LinkFlow</h1>
        <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
          Linkbuilding Operations Platform
        </p>
      </div>
      <Link href="/login" className={buttonVariants({ size: 'lg' })}>
        Sign in
      </Link>
    </main>
  )
}
