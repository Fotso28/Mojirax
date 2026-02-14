import { TextareaHTMLAttributes, useId } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
}

export function Textarea({
    label,
    error,
    className = '',
    id,
    ...props
}: TextareaProps) {
    const generatedId = useId();
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : `textarea-${generatedId}`);

    return (
        <div className={`space-y-1.5 ${className}`}>
            {label && (
                <label
                    htmlFor={textareaId}
                    className="block text-sm font-medium text-gray-700"
                >
                    {label} {props.required && <span className="text-red-500">*</span>}
                </label>
            )}
            <textarea
                id={textareaId}
                className={`
                    w-full min-h-[120px] bg-white border rounded-lg text-gray-900 text-base p-4
                    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary
                    ${error ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'}
                    placeholder:text-gray-400
                    resize-y
                `}
                {...props}
            />
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
}
