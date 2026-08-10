import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '../(auth)/actions'
import Link from 'next/link'
import { NotificationsDropdown } from '@/components/NotificationsDropdown'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch the account name from the accounts table using the authenticated user's ID
  const { data: accountData } = await supabase
    .from('accounts')
    .select('name')
    .single()

  const accountName = accountData?.name || 'your Dashboard'

  // Fetch user's proposals
  const { data: proposals } = await supabase
    .from('proposals')
    .select('id, content, updated_at, status')
    .eq('status', 'DRAFT')
    .order('updated_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">Proposal Platform</h1>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationsDropdown />
              <span className="text-sm text-gray-500">{user.email}</span>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Log out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome to {accountName}
          </h2>
          <Link
            href="/dashboard/proposals/new"
            className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            New Proposal
          </Link>
        </div>

        {proposals && proposals.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {proposals.map((proposal) => {
              const title = proposal.content?.title || 'Untitled Proposal'
              const clientName = proposal.content?.clientName || 'Unknown Client'
              return (
                <div
                  key={proposal.id}
                  className="overflow-hidden rounded-lg bg-white shadow flex flex-col"
                >
                  <div className="p-6 flex-1">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Client: {clientName}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      Last updated: {new Date(proposal.updated_at).toLocaleDateString()}
                    </p>
                    <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 mt-4 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                      {proposal.status}
                    </span>
                  </div>
                  <div className="bg-gray-50 px-6 py-3 flex justify-between items-center border-t border-gray-100">
                    <Link
                      href={`/dashboard/proposals/${proposal.id}/edit`}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
                    >
                      Edit Proposal
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No proposals</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new proposal.
            </p>
            <div className="mt-6">
              <Link
                href="/dashboard/proposals/new"
                className="inline-flex items-center rounded-md bg-black px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                Create Proposal
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
