import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function TemplatesPage() {
  const supabase = await createClient()

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    redirect('/login')
  }

  // Fetch system templates
  const { data: templates, error } = await supabase
    .from('templates')
    .select('*')
    .eq('is_system_default', true)
    .order('name')

  if (error) {
    console.error("Error fetching templates", error)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Template Library</h1>
          <p className="mt-2 text-sm text-gray-600">Select a template to start building your proposal.</p>
        </div>
        <Link 
          href="/dashboard/brand-kit"
          className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
        >
          Edit Brand Kit
        </Link>
      </div>

      {(!templates || templates.length === 0) ? (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No templates</h3>
          <p className="mt-1 text-sm text-gray-500">
            No templates available yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
              <div className="h-40 bg-gray-100 flex items-center justify-center p-6 border-b border-gray-200">
                {/* Visual placeholder for the template */}
                <div className="w-full h-full bg-white rounded shadow-sm border border-gray-100 p-4">
                  <div className="w-1/3 h-2 bg-gray-200 rounded mb-2"></div>
                  <div className="w-1/2 h-4 bg-gray-300 rounded mb-4"></div>
                  <div className="w-full h-12 bg-gray-50 rounded"></div>
                </div>
              </div>
              <div className="p-6">
                <span className="inline-block px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full mb-3">
                  {template.category}
                </span>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
                
                <div className="mt-6">
                  {/* In Sprint 3, this will link to proposal creation with this template */}
                  <button className="w-full py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                    Use Template
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
