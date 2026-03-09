export function Divider({ text }: { text?: string }) {
    if (!text) {
        return <hr className="border-gray-200" />;
    }

    return (
        <div className="relative flex items-center my-6">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-4 text-sm text-gray-500">{text}</span>
            <div className="flex-grow border-t border-gray-200"></div>
        </div>
    );
}
