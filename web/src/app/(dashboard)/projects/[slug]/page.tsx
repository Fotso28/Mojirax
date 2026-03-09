import ProjectDeck from '@/components/project-deck/project-deck';

export default async function ProjectPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    return (
        <div className="py-6 sm:p-8 max-w-5xl mx-auto">
            <ProjectDeck projectId={slug} />
        </div>
    );
}
