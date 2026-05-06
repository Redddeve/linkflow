import { requireUser } from '@/lib/auth'

export default async function DashboardPage() {
  const user = await requireUser()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">
        Welcome, {user.first_name || user.email}
      </h1>
      <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
        You are signed in as <strong>{user.role}</strong>.
      </p>
    </div>
  )
}
