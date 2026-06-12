import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function PasswordInput({
    variant = 'tailwind',
    className = '',
    ...props
}) {
    const [showPassword, setShowPassword] = useState(false)

    const toggle = () => setShowPassword((prev) => !prev)
    const inputType = showPassword ? 'text' : 'password'
    const ariaLabel = showPassword ? 'Hide password' : 'Show password'

    if (variant === 'bootstrap') {
        return (
            <div className="input-group">
                <input type={inputType} className={className} {...props} />
                <div className="input-group-append">
                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={toggle}
                        aria-label={ariaLabel}
                    >
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="relative">
            <input
                type={inputType}
                className={`${className}${className.includes('pr-') ? '' : ' pr-12'}`}
                {...props}
            />
            <button
                type="button"
                onClick={toggle}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] transition-colors hover:text-[#102059]"
                aria-label={ariaLabel}
            >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
        </div>
    )
}
