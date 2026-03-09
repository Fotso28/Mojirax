import { InputHTMLAttributes, useState, ReactNode, useId } from 'react';
import { Eye, EyeOff } from 'lucide-react'; // Assuming lucide-react is available, or use SVG

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: ReactNode;
}

export function Input({
    label,
    error,
    icon,
    className = '',
    type = 'text',
    id,
    ...props
}: InputProps) {
    const [showPassword, setShowPassword] = useState(false);
    const generatedId = useId();
    // Safe ID generation: prefer id, then label-based, then stable generated ID
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : `input-${generatedId}`);

    const isPassword = type === 'password';
    const currentType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
        <div className={`space-y-1.5 ${className}`}>
            {label && (
                <label
                    htmlFor={inputId}
                    className="block text-sm font-medium text-gray-700"
                >
                    {label} {props.required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="relative group">
                {icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-kezak-primary transition-colors">
                        {icon}
                    </div>
                )}
                <input
                    id={inputId}
                    type={currentType}
                    className={`
                        w-full h-[52px] bg-white border rounded-lg text-gray-900 text-base
                        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary
                        ${icon ? 'pl-11' : 'pl-4'}
                        ${isPassword ? 'pr-11' : 'pr-4'}
                        ${error ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'}
                        placeholder:text-gray-400
                    `}
                    {...props}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        {showPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057 5.064-7 9.542-7 1.253 0 2.426.235 3.521.657m1.521 1.521L19.75 3M3 3l3.59 3.59m0 0A9.919 9.919 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        )}
                    </button>
                )}
            </div>
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
}
