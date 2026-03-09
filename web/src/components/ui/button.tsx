import { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'social-google' | 'social-linkedin' | 'legacy-purple';
    children: ReactNode;
    icon?: ReactNode;
    fullWidth?: boolean;
}

export function Button({
    variant = 'primary',
    children,
    icon,
    fullWidth = false,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    const baseStyles = 'inline-flex items-center justify-center gap-3 px-4 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

    const variantStyles = {
        primary: 'bg-kezak-primary text-white hover:bg-kezak-dark focus:ring-kezak-primary shadow-sm h-[52px]',
        'legacy-purple': 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 focus:ring-purple-500 shadow-md hover:shadow-lg h-[52px]',
        secondary: 'bg-white border-2 border-kezak-light text-kezak-dark hover:bg-kezak-light/50 focus:ring-kezak-primary h-[52px]',
        'social-google': 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 flex items-center justify-center w-[52px] h-[52px]',
        'social-linkedin': 'bg-[#0A66C2] text-white hover:bg-[#004182] focus:ring-blue-600 h-[52px]',
    };

    const widthStyles = fullWidth ? 'w-full' : '';
    const disabledStyles = disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer';

    return (
        <button
            className={`${baseStyles} ${variantStyles[variant]} ${widthStyles} ${disabledStyles} ${className}`}
            disabled={disabled}
            {...props}
        >
            {icon && <span className="flex-shrink-0">{icon}</span>}
            <span>{children}</span>
        </button>
    );
}
