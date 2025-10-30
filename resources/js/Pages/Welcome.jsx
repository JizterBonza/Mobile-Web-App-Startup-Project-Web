import { Head, Link } from '@inertiajs/react'

export default function Welcome({ auth }) {
  return (
    <>
      <Head title="Welcome" />
      <div className="hold-transition login-page">
        <div className="login-box">
          <div className="login-logo">
            <Link href="/">
              <b>Agrify</b>Connect
            </Link>
          </div>
          
          <div className="card">
            <div className="card-body login-card-body">
              <div className="text-center">
                <div className="mb-4">
                  <div className="mx-auto d-inline-block" style={{width: '60px', height: '60px', backgroundColor: '#007bff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <i className="fas fa-seedling text-white" style={{fontSize: '24px'}}></i>
                  </div>
                </div>
                <h3 className="login-box-msg mb-4">
                  Welcome to Agrify Connect
                </h3>
                <p className="text-muted mb-4">
                  Your agricultural management platform
                </p>
                
                {auth.user ? (
                  <div className="mb-4">
                    <div className="alert alert-success">
                      <h5><i className="icon fas fa-check"></i> Welcome back!</h5>
                      Hello, <strong>{auth.user.name}</strong>!<br />
                      You are successfully logged in.
                    </div>
                    <Link
                      href="/dashboard"
                      className="btn btn-primary btn-block"
                    >
                      <i className="fas fa-tachometer-alt mr-2"></i>
                      Go to Dashboard
                    </Link>
                  </div>
                ) : (
                  <div className="mb-4">
                    <Link
                      href="/login"
                      className="btn btn-primary btn-block mb-2"
                    >
                      <i className="fas fa-sign-in-alt mr-2"></i>
                      Sign In
                    </Link>
                    <Link
                      href="/register"
                      className="btn btn-outline-primary btn-block"
                    >
                      <i className="fas fa-user-plus mr-2"></i>
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
