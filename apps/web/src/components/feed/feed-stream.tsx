'use client';

import { ProjectCard } from './project-card';
import { NativeAd } from './native-ad';

// Mock Data Factory
const MOCK_PROJECTS = Array.from({ length: 15 }).map((_, i) => ({
    id: `proj-${i}`,
    title: [
        "Plateforme de livraison par drone",
        "Uber pour les motos taxis (Benskin)",
        "Marketplace agricole BIO",
        "Fintech pour l'épargne tontinière",
        "IA pour la détection de maladies cacao"
    ][i % 5],
    description: "Nous construisons une solution révolutionnaire pour résoudre le problème logistique au Cameroun. Notre MVP est prêt et nous cherchons un CTO pour passer à l'échelle. Stack: React Native, Node.js.",
    stage: i % 3 === 0 ? "Idée" : i % 3 === 1 ? "MVP" : "Croissance",
    sector: ["Logistique", "Transport", "AgriTech", "FinTech", "DeepTech"][i % 5],
    location: ["Douala", "Yaoundé", "Buea", "Bafoussam", "Remote"][i % 5],
    author: {
        name: ["Jean Dupont", "Marie Ngassa", "Alexandre K.", "Sophie M.", "Paul T."][i % 5],
        role: "CEO & Fondateur",
        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`
    },
    tags: ["React Native", "Node.js", "Marketing", "Sales"],
    postedAt: "Il y a 2h"
}));

export function FeedStream() {
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            {MOCK_PROJECTS.map((project, index) => {
                // Inject Ad every 5 posts
                const showAd = index > 0 && index % 5 === 0;

                return (
                    <div key={project.id} className="space-y-6">
                        {showAd && <NativeAd />}
                        <ProjectCard project={project} />
                    </div>
                );
            })}

            {/* End of Feed */}
            <div className="text-center py-8 text-gray-400 text-sm">
                Vous êtes à jour ! 🎉
            </div>
        </div>
    );
}
