import { useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import AuthLayout from '../../Layouts/AuthLayout';

export default function Register() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/register');
    };

    return (
        <AuthLayout title="Register">
            <p className="login-box-msg">Register a new membership</p>
            
            <form onSubmit={submit}>
                <div className="input-group mb-3">
                    <input
                        type="text"
                        className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                        placeholder="Full name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                    />
                    <div className="input-group-append">
                        <div className="input-group-text">
                            <span className="fas fa-user"></span>
                        </div>
                    </div>
                    {errors.name && (
                        <div className="invalid-feedback">
                            {errors.name}
                        </div>
                    )}
                </div>
                
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
                
                <div className="input-group mb-3">
                    <input
                        type="password"
                        className={`form-control ${errors.password_confirmation ? 'is-invalid' : ''}`}
                        placeholder="Retype password"
                        value={data.password_confirmation}
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        required
                    />
                    <div className="input-group-append">
                        <div className="input-group-text">
                            <span className="fas fa-lock"></span>
                        </div>
                    </div>
                    {errors.password_confirmation && (
                        <div className="invalid-feedback">
                            {errors.password_confirmation}
                        </div>
                    )}
                </div>
                
                <div className="row">
                    <div className="col-8">
                        <div className="icheck-primary">
                            <input type="checkbox" id="agreeTerms" name="terms" value="agree" required />
                            <label htmlFor="agreeTerms">
                                I agree to the <a href="#">terms</a>
                            </label>
                        </div>
                    </div>
                    <div className="col-4">
                        <button
                            type="submit"
                            className="btn btn-primary btn-block"
                            disabled={processing}
                        >
                            {processing ? 'Registering...' : 'Register'}
                        </button>
                    </div>
                </div>
            </form>

            <p className="mb-0">
                <Link href="/login" className="text-center">
                    I already have a membership
                </Link>
            </p>
        </AuthLayout>
    );
}
