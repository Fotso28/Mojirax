import ProjectDeck from '@/components/project-deck/project-deck';

export default async function ProjectPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <ProjectDeck projectId={id} />
        </div>
    );
}
