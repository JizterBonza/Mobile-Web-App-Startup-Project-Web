import { useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Eye, EyeOff, HelpCircle, X, Send, ArrowLeft } from 'lucide-react';

export default function Login() {
    const { flash } = usePage().props;
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        post('/login');
    };

    const formError =
        errors.email ||
        errors.password ||
        (typeof flash?.error === 'string' ? flash.error : null);

    const handleGoogleLogin = () => {
        window.alert('Google login is not yet available.');
    };

    return (
        <>
            <Head title="Sign In" />
            <div className="klasmeyt-landing min-h-screen bg-gradient-to-br from-[#F8F9FB] to-[#EEF2FF] flex items-center justify-center p-4 relative">
                <div
                    className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{
                        backgroundImage: `repeating-linear-gradient(0deg, #102059 0px, #102059 1px, transparent 1px, transparent 20px),
                           repeating-linear-gradient(90deg, #102059 0px, #102059 1px, transparent 1px, transparent 20px)`,
                    }}
                />

                <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="absolute top-6 right-6 z-20 p-3 bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-all"
                    aria-label="Help"
                >
                    <HelpCircle className="w-5 h-5 text-[#6B7280]" />
                </button>

                <Link
                    href="/"
                    className="absolute top-6 left-6 z-20 p-3 bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-all group"
                    title="Back to Home"
                >
                    <ArrowLeft className="w-5 h-5 text-[#6B7280] group-hover:text-[#102059]" />
                </Link>

                <div className="relative z-10 w-full max-w-[1100px] bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden grid lg:grid-cols-2 shadow-sm">
                    <div className="p-8 sm:p-12 lg:p-16">
                        <div className="text-center mb-10 lg:mb-12">
                            <Link href="/">
                                <h1 className="text-4xl font-bold text-[#102059]">Klasmeyt</h1>
                            </Link>
                        </div>

                        {formError && (
                            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                                <p className="text-sm text-red-600">{formError}</p>
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-6">
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-xs font-bold text-[#6B7280] mb-2 uppercase tracking-wide"
                                >
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className={`w-full px-4 py-3 text-sm bg-[#F9FAFB] border rounded-lg focus:outline-none focus:border-[#102059] hover:border-[#9CA3AF] transition-all ${
                                        errors.email ? 'border-red-400' : 'border-[#E5E7EB]'
                                    }`}
                                    placeholder="you@example.com"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-xs font-bold text-[#6B7280] mb-2 uppercase tracking-wide"
                                >
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        autoComplete="current-password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        className={`w-full px-4 py-3 pr-12 text-sm bg-[#F9FAFB] border rounded-lg focus:outline-none focus:border-[#102059] hover:border-[#9CA3AF] transition-all ${
                                            errors.password ? 'border-red-400' : 'border-[#E5E7EB]'
                                        }`}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#102059] transition-colors"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-5 h-5" />
                                        ) : (
                                            <Eye className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center">
                                <input
                                    id="remember"
                                    type="checkbox"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="w-4 h-4 rounded border-[#E5E7EB] text-[#102059] focus:ring-[#102059]"
                                />
                                <label htmlFor="remember" className="ml-2 text-sm text-[#6B7280]">
                                    Remember me
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full py-3 bg-[#102059] hover:bg-[#0A1540] text-white font-bold text-sm uppercase tracking-wide rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processing ? 'Signing in...' : 'Sign In'}
                            </button>

                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-[#E5E7EB]" />
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="px-4 bg-white text-xs text-[#9CA3AF] uppercase">Or</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                className="w-full py-3 bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#1F2937] font-semibold text-sm rounded-lg transition-all flex items-center justify-center gap-3"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                Continue with Google
                            </button>

                            <div className="pt-2 text-center text-sm text-[#6B7280] space-y-2">
                                <p>
                                    <button
                                        type="button"
                                        onClick={() => setShowHelpModal(true)}
                                        className="text-[#102059] font-semibold hover:underline"
                                    >
                                        Need help signing in?
                                    </button>
                                </p>
                                <p>
                                    <Link href="/register" className="text-[#102059] font-semibold hover:underline">
                                        Create an account
                                    </Link>
                                </p>
                            </div>
                        </form>
                    </div>

                    <div className="hidden lg:flex flex-col bg-gradient-to-br from-[#102059] to-[#244693] p-12 relative overflow-hidden justify-between min-h-[520px]">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10">
                            <h2 className="text-3xl font-bold text-white mb-3 uppercase tracking-wide">
                                Admin Centre
                            </h2>
                            <p className="text-sm text-[#ffffffc7] leading-relaxed">
                                Complete business management for agrivet stores and vendors. Sign in to access your
                                dashboard.
                            </p>
                        </div>

                        <div className="relative z-10">
                            <p className="text-white/40 text-xs">© 2026 Klasmeyt. All rights reserved.</p>
                        </div>
                    </div>
                </div>

                {showHelpModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-[#102059]/60 backdrop-blur-sm"
                            onClick={() => setShowHelpModal(false)}
                            role="presentation"
                        />

                        <div className="relative bg-white rounded-2xl border border-[#E5E7EB] max-w-md w-full overflow-hidden max-h-[90vh] flex flex-col shadow-xl">
                            <div className="bg-gradient-to-r from-[#244693] to-[#102059] p-6 shrink-0">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-white uppercase tracking-wide">
                                        Need help?
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowHelpModal(false)}
                                        className="text-white/70 hover:text-white transition-colors"
                                        aria-label="Close"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <form
                                className="p-6 space-y-4 overflow-y-auto"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    window.alert('Thanks — our team will follow up by email.');
                                    setShowHelpModal(false);
                                }}
                            >
                                <div>
                                    <label className="block text-xs font-bold text-[#6B7280] mb-2 uppercase tracking-wide">
                                        Your name
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#102059] transition-all"
                                        placeholder="Jane Doe"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[#6B7280] mb-2 uppercase tracking-wide">
                                        Email address
                                    </label>
                                    <input
                                        type="email"
                                        className="w-full px-4 py-2.5 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#102059] transition-all"
                                        placeholder="you@example.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[#6B7280] mb-2 uppercase tracking-wide">
                                        Subject
                                    </label>
                                    <select className="w-full px-4 py-2.5 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#102059] transition-all">
                                        <option>Login issues</option>
                                        <option>Forgot password</option>
                                        <option>Account access</option>
                                        <option>Technical support</option>
                                        <option>Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[#6B7280] mb-2 uppercase tracking-wide">
                                        Message
                                    </label>
                                    <textarea
                                        rows={4}
                                        className="w-full px-4 py-2.5 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#102059] transition-all resize-none"
                                        placeholder="Describe your issue..."
                                    />
                                </div>

                                <p className="text-xs text-[#6B7280] bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    Our support team typically responds within 24 hours on business days.
                                </p>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowHelpModal(false)}
                                        className="flex-1 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] hover:bg-[#EEF2FF] text-[#6B7280] font-semibold text-sm rounded-lg transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-2.5 bg-[#E20E28] hover:bg-[#C00D24] text-white font-semibold text-sm rounded-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        <Send className="w-4 h-4" />
                                        Submit
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
