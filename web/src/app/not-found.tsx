import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
            <h1 className="text-7xl font-bold text-gray-900">404</h1>
            <p className="mt-4 text-xl text-gray-600">Cette page est introuvable.</p>
            <Link
                href="/"
                className="mt-8 inline-flex items-center justify-center gap-2 bg-kezak-primary text-white hover:bg-kezak-dark h-[52px] px-8 rounded-lg font-semibold transition-all duration-200"
            >
                Retour à l&apos;accueil
            </Link>
        </div>
    );
}
