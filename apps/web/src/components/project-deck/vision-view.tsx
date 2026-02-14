import { motion } from 'framer-motion';

export function VisionView({ project }: { project: any }) {
    return (
        <div className="space-y-8 py-4">
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900">{project.title}</h2>
                <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                    <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wide mb-2">
                        Le Pitch
                    </h3>
                    <p className="text-lg text-blue-950 leading-relaxed">
                        {project.pitch}
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">La Vision</h3>
                <p className="text-gray-600 leading-relaxed">
                    {/* Mock long description */}
                    Nous construisons le futur de l'agriculture en Afrique. En utilisant des capteurs IoT low-cost et une IA optimisée pour le edge computing, nous permettons aux petits exploitants de doubler leurs rendements.
                </p>
                <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="text-sm text-gray-500 mb-1">Stade actuel</div>
                        <div className="font-medium text-gray-900">{project.stage}</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="text-sm text-gray-500 mb-1">Marché cible</div>
                        <div className="font-medium text-gray-900">Cameroun & CEMAC</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
