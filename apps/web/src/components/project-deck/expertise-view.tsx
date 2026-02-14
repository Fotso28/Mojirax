export function ExpertiseView({ project }: { project: any }) {
    return (
        <div className="space-y-8 py-4">
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Compétences recherchées</h3>
                    <div className="flex flex-wrap gap-2">
                        {['React', 'Node.js', 'PostgreSQL', 'Docker'].map((tech) => (
                            <span
                                key={tech}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium border border-gray-200"
                            >
                                {tech}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 border border-gray-100 rounded-2xl bg-white shadow-sm">
                        <h4 className="font-medium text-gray-900 mb-3">Hard Skills</h4>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                Architecture Microservices
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                DevOps & CI/CD
                            </li>
                        </ul>
                    </div>
                    <div className="p-5 border border-gray-100 rounded-2xl bg-white shadow-sm">
                        <h4 className="font-medium text-gray-900 mb-3">Soft Skills</h4>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                Leadership technique
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                Résilience
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
