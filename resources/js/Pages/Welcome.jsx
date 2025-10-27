import { Head, Link } from '@inertiajs/react'

export default function Welcome({ auth }) {
  return (
    <>
      <Head title="Welcome" />
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-8">
              <div className="text-center">
                <div className="mb-6">
                  <div className="mx-auto h-12 w-12 bg-primary-500 rounded-full flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  Welcome to Agrify Connect
                </h1>
                <p className="text-gray-600 mb-8">
                  Your Laravel application with Inertia.js and React is ready!
                </p>
                
                {auth.user ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-800 font-medium">
                        Hello, {auth.user.name}!
                      </p>
                      <p className="text-green-600 text-sm">
                        You are successfully logged in.
                      </p>
                    </div>
                    <Link
                      href="/dashboard"
                      className="inline-block w-full bg-white hover:bg-gray-50 text-primary-500 font-bold py-3 px-4 rounded-lg border-2 border-primary-500 transition-colors"
                    >
                      Go to Dashboard
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Link
                      href="/login"
                      className="inline-block w-full bg-white hover:bg-gray-50 text-primary-500 font-bold py-3 px-4 rounded-lg border-2 border-primary-500 transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/register"
                      className="inline-block w-full bg-white hover:bg-gray-50 text-primary-500 font-bold py-3 px-4 rounded-lg border-2 border-primary-500 transition-colors"
                    >
                      Create Account
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
