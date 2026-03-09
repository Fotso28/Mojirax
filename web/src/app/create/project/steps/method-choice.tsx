'use client';

import { useOnboarding } from '@/context/onboarding-context';
import { FileText, Upload } from 'lucide-react';
import { motion } from 'framer-motion';

export function ProjectMethodChoiceStep() {
    const { data, updateData, nextStep } = useOnboarding();

    const handleChoice = (method: 'form' | 'document') => {
        updateData('creation_method', method);
        nextStep();
    };

    return (
        <div className="space-y-8">
            <div className="space-y-2 text-center sm:text-left">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                    Comment créer votre projet ?
                </h1>
                <p className="text-lg text-gray-500">
                    Choisissez la méthode qui vous convient le mieux
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-4">
                {/* Option 1: Formulaire */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleChoice('form')}
                    className={`group relative flex flex-col items-center text-center p-8 rounded-2xl border-2 transition-all duration-200 ${
                        data.creation_method === 'form'
                            ? 'border-kezak-primary bg-kezak-light/50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all duration-200 ${
                        data.creation_method === 'form'
                            ? 'bg-kezak-primary text-white'
                            : 'bg-gray-100 text-gray-500 group-hover:bg-kezak-light group-hover:text-kezak-primary'
                    }`}>
                        <FileText className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Remplir le formulaire</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                        Suivez les étapes guidées pour décrire votre projet pas à pas
                    </p>
                </motion.button>

                {/* Option 2: Document */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleChoice('document')}
                    className={`group relative flex flex-col items-center text-center p-8 rounded-2xl border-2 transition-all duration-200 ${
                        data.creation_method === 'document'
                            ? 'border-kezak-primary bg-kezak-light/50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all duration-200 ${
                        data.creation_method === 'document'
                            ? 'bg-kezak-primary text-white'
                            : 'bg-gray-100 text-gray-500 group-hover:bg-kezak-light group-hover:text-kezak-primary'
                    }`}>
                        <Upload className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Uploader un document</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                        Importez votre dossier projet (PDF ou Word) et laissez l&apos;IA faire le reste
                    </p>
                </motion.button>
            </div>
        </div>
    );
}
