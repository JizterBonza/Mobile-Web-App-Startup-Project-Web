import { useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import AuthLayout from '../../Layouts/AuthLayout';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post('/login');
    };

    return (
        <AuthLayout title="Sign In">
            <p className="login-box-msg">Sign in to start your session</p>
            
            <form onSubmit={submit}>
                <div className="input-group mb-3">
                    <input
                        type="email"
                        className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                        placeholder="Email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />
                    <div className="input-group-append">
                        <div className="input-group-text">
                            <span className="fas fa-envelope"></span>
                        </div>
                    </div>
                    {errors.email && (
                        <div className="invalid-feedback">
                            {errors.email}
                        </div>
                    )}
                </div>
                
                <div className="input-group mb-3">
                    <input
                        type="password"
                        className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                        placeholder="Password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />
                    <div className="input-group-append">
                        <div className="input-group-text">
                            <span className="fas fa-lock"></span>
                        </div>
                    </div>
                    {errors.password && (
                        <div className="invalid-feedback">
                            {errors.password}
                        </div>
                    )}
                </div>
                
                <div className="row">
                    <div className="col-8">
                        <div className="icheck-primary">
                            <input
                                type="checkbox"
                                id="remember"
                                checked={data.remember}
                                onChange={(e) => setData('remember', e.target.checked)}
                            />
                            <label htmlFor="remember">
                                Remember Me
                            </label>
                        </div>
                    </div>
                    <div className="col-4">
                        <button
                            type="submit"
                            className="btn btn-primary btn-block"
                            disabled={processing}
                        >
                            {processing ? 'Signing In...' : 'Sign In'}
                        </button>
                    </div>
                </div>
            </form>

            <p className="mb-1">
                <Link href="/forgot-password" className="text-center">
                    I forgot my password
                </Link>
            </p>
            <p className="mb-0">
                <Link href="/register" className="text-center">
                    Register a new membership
                </Link>
            </p>
        </AuthLayout>
    );
}
