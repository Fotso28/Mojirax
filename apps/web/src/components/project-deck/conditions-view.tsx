import { Clock, PieChart, Briefcase } from 'lucide-react';

export function ConditionsView({ project }: { project: any }) {
    return (
        <div className="space-y-8 py-4">
            <h3 className="text-lg font-semibold text-gray-900">Les conditions du pacte</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-sm mb-3">
                        <PieChart size={20} />
                    </div>
                    <div className="text-sm text-indigo-900 font-medium mb-1">Equity</div>
                    <div className="text-2xl font-bold text-indigo-700">{project.equity}</div>
                </div>

                <div className="p-6 bg-orange-50 rounded-2xl border border-orange-100 flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-orange-600 shadow-sm mb-3">
                        <Clock size={20} />
                    </div>
                    <div className="text-sm text-orange-900 font-medium mb-1">Temps</div>
                    <div className="text-2xl font-bold text-orange-700">Part-time</div>
                </div>

                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-sm mb-3">
                        <Briefcase size={20} />
                    </div>
                    <div className="text-sm text-emerald-900 font-medium mb-1">Rétribution</div>
                    <div className="text-2xl font-bold text-emerald-700">Aucune</div>
                </div>
            </div>

            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <h4 className="font-medium text-gray-900 mb-2">Note du fondateur</h4>
                <p className="text-gray-600 text-sm italic">
                    "Je cherche quelqu'un qui peut s'investir 10h/semaine le soir et le weekend pour sortir le MVP en 3 mois. Pas de salaire au début, mais une grosse part du gâteau."
                </p>
            </div>
        </div>
    );
}
