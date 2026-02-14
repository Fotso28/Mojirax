import { Modal } from '@/components/ui/modal';
import ProjectDeck from '@/components/project-deck/project-deck';

export default async function ProjectModal({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    // In a real app, fetch data here

    return (
        <Modal>
            <ProjectDeck projectId={id} />
        </Modal>
    );
}
