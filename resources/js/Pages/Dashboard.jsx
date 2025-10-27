import { Head, Link, useForm } from '@inertiajs/react'

export default function Dashboard({ auth }) {
  const { post } = useForm();

  const handleLogout = (e) => {
    e.preventDefault();
    post('/logout');
  };

  return (
    <>
      <Head title="Dashboard" />
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  Agrify Connect Dashboard
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">Welcome, {auth.user.name}</span>
                <button
                  onClick={handleLogout}
                  className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Dashboard Content
                </h2>
                <p className="text-gray-600">
                  Your dashboard is ready! Start building your application.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
