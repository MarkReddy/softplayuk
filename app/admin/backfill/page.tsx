'use client'

import { AdminAuthProvider, useAdminAuth } from '@/components/admin-auth-provider'
import { BackfillDashboard } from '@/components/admin/backfill-dashboard'
import { AdminLogin } from '@/components/admin/admin-login'

export default function BackfillPage() {
  return (
    <AdminAuthProvider>
      <BackfillGate />
    </AdminAuthProvider>
  )
}

function BackfillGate() {
  const { isAuthenticated } = useAdminAuth()
  if (!isAuthenticated) return <AdminLogin />
  return <BackfillDashboard />
}
