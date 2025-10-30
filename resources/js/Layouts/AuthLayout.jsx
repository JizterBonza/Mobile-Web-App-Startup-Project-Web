import { Head, Link } from '@inertiajs/react'

export default function AuthLayout({ children, title = 'Authentication' }) {
  return (
    <>
      <Head title={title} />
      <div className="hold-transition login-page">
        <div className="login-box">
          <div className="login-logo">
            <Link href="/">
              <b>Agrify</b>Connect
            </Link>
          </div>
          
          <div className="card">
            <div className="card-body login-card-body">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
