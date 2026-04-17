'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import Link from 'next/link';
import { Plus, ArrowRight, Calendar, Layers, Globe, Users, Pencil, Trash2, AlertTriangle, Clock, CheckCircle2, XCircle, Lock } from 'lucide-react';
import { DeleteBottomSheet } from '@/components/ui/delete-bottom-sheet';
import { getSectorLabel } from '@/lib/constants/sectors';
import { useTranslation, useLocale } from '@/context/i18n-context';
import { useUpsell } from '@/context/upsell-context';
import { formatDateShort } from '@/lib/utils/format-date';

export default function MyProjectsPage() {
  const { dbUser, loading, refreshDbUser } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const locale = useLocale();
  const { openUpsell } = useUpsell();
  const isFreeUser = !dbUser?.plan || dbUser.plan === 'FREE';
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showNewProjectWarning, setShowNewProjectWarning] = useState(false);

  const STATUS_LABELS = useMemo(() => ({
    DRAFT: { label: t('common.status_draft'), className: 'bg-gray-100 text-gray-600' },
    PENDING_AI: { label: t('common.status_pending_ai'), className: 'bg-amber-50 text-amber-600' },
    ANALYZING: { label: t('common.status_analyzing'), className: 'bg-blue-50 text-blue-600' },
    PUBLISHED: { label: t('common.status_published'), className: 'bg-green-50 text-green-600' },
    REJECTED: { label: t('common.status_rejected'), className: 'bg-red-50 text-red-600' },
  }), [t]);

  const handleDelete = async () => {
    if (!confirmDeleteId) return;

    setDeletingId(confirmDeleteId);
    try {
      await AXIOS_INSTANCE.delete(`/projects/${confirmDeleteId}`);
      showToast(t('dashboard.project_deleted'));
      setConfirmDeleteId(null);
      await refreshDbUser();
    } catch {
      showToast(t('dashboard.project_delete_error'), 'error');
    } finally {
      setDeletingId(null);
    }
  };
  const projects = dbUser?.projects ?? [];
  const sortedProjects = [...projects].sort((a: any, b: any) => {
    if (a.status === 'PUBLISHED' && b.status !== 'PUBLISHED') return -1;
    if (a.status !== 'PUBLISHED' && b.status === 'PUBLISHED') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const hasPublished = projects.some((p: any) => p.status === 'PUBLISHED');

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-5 w-64 bg-gray-100 rounded-lg animate-pulse mt-2" />
          </div>
          <div className="h-[52px] w-44 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="h-6 w-56 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-full bg-gray-100 rounded animate-pulse mt-3" />
              <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse mt-2" />
              <div className="flex gap-3 mt-4">
                <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            {t('dashboard.my_projects_title')}
          </h1>
          <p className="mt-2 text-lg text-gray-500">
            {t('dashboard.my_projects_subtitle')}
          </p>
        </div>
        {isFreeUser ? (
          <button
            onClick={() => openUpsell('create_project')}
            className="inline-flex items-center justify-center gap-2 bg-kezak-primary text-white hover:bg-kezak-dark h-[52px] px-6 rounded-lg font-semibold transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-kezak-primary shrink-0"
          >
            <Lock className="w-4 h-4" />
            {t('dashboard.new_project')}
          </button>
        ) : hasPublished ? (
          <button
            onClick={() => setShowNewProjectWarning(true)}
            className="inline-flex items-center justify-center gap-2 bg-kezak-primary text-white hover:bg-kezak-dark h-[52px] px-6 rounded-lg font-semibold transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-kezak-primary shrink-0"
          >
            <Plus className="w-5 h-5" />
            {t('dashboard.new_project')}
          </button>
        ) : (
          <Link
            href="/create/project"
            className="inline-flex items-center justify-center gap-2 bg-kezak-primary text-white hover:bg-kezak-dark h-[52px] px-6 rounded-lg font-semibold transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-kezak-primary shrink-0"
          >
            <Plus className="w-5 h-5" />
            {t('dashboard.new_project')}
          </Link>
        )}
      </div>

      {/* Projects list or empty state */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 shadow-sm text-center">
          <div className="mx-auto w-16 h-16 bg-kezak-light rounded-full flex items-center justify-center mb-4">
            <Layers className="w-8 h-8 text-kezak-primary" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {t('dashboard.no_projects_title')}
          </h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {t('dashboard.no_projects_description')}
          </p>
          <Link
            href="/create/project"
            className="inline-flex items-center justify-center gap-2 bg-kezak-primary text-white hover:bg-kezak-dark h-[52px] px-8 rounded-lg font-semibold transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-kezak-primary"
          >
            <Plus className="w-5 h-5" />
            {t('dashboard.create_project')}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedProjects.map((project: any) => {
            const status = STATUS_LABELS[project.status as keyof typeof STATUS_LABELS] ?? STATUS_LABELS.DRAFT;
            const date = formatDateShort(project.createdAt, locale);

            return (
              <div
                key={project.id}
                className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-bold text-gray-900">
                        {project.name}
                      </h3>
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <p className="mt-2 text-gray-600 leading-relaxed line-clamp-2">
                      {project.pitch}
                    </p>

                    <div className="flex items-center flex-wrap gap-4 mt-3">
                      {project.sector && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
                          <Globe className="w-3.5 h-3.5" />
                          {getSectorLabel(project.sector)}
                        </span>
                      )}
                      {project.stage && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
                          <Layers className="w-3.5 h-3.5" />
                          {project.stage}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        {date}
                      </span>
                    </div>
                  </div>

                  {/* Moderation status banner */}
                  {project.status === 'PENDING_AI' && (
                    <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <p className="text-sm text-amber-700">
                        {t('dashboard.project_pending_review')}
                      </p>
                    </div>
                  )}
                  {project.status === 'REJECTED' && (
                    <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                      <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-700">
                          {t('dashboard.project_rejected')}
                        </p>
                        {(project as any).moderationLogs?.[0]?.aiReason && (
                          <p className="text-sm text-red-600 mt-1">
                            {t('dashboard.project_rejected_reason', { reason: (project as any).moderationLogs[0].aiReason })}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-50">
                    <Link
                      href={`/my-project/${project.slug ?? project.id}/applications`}
                      className="inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-600 hover:bg-gray-50 h-[40px] px-4 rounded-lg font-semibold transition-all duration-200 text-sm"
                    >
                      <Users className="w-4 h-4" />
                      {t('common.applications')}
                      {(project._count?.applications != null && project._count.applications > 0) && (
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-kezak-primary rounded-full">
                          {project._count.applications}
                        </span>
                      )}
                    </Link>
                    <Link
                      href={`/modify/project?projectId=${project.id}`}
                      className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm rounded-lg px-4 h-[40px] transition-all duration-200"
                    >
                      <Pencil className="w-4 h-4" />
                      {t('common.edit')}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(project.id)}
                      disabled={deletingId === project.id}
                      className="inline-flex items-center justify-center gap-2 bg-white border border-red-200 text-red-500 hover:bg-red-50 text-sm rounded-lg px-4 h-[40px] transition-all duration-200 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deletingId === project.id ? t('common.deleting') : t('common.delete')}
                    </button>
                    <Link
                      href={`/projects/${project.slug ?? project.id}`}
                      className="inline-flex items-center justify-center gap-2 bg-white border-2 border-kezak-light text-kezak-dark hover:bg-kezak-light/50 h-[40px] px-4 rounded-lg font-semibold transition-all duration-200 text-sm"
                    >
                      {t('dashboard.view_project')}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showNewProjectWarning && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t('dashboard.project_already_published_title')}</h3>
            </div>
            <p className="text-sm text-gray-600">
              {t('dashboard.project_already_published_description')}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowNewProjectWarning(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <Link
                href="/create/project"
                className="flex-1 px-4 py-2.5 bg-kezak-primary text-white rounded-lg text-sm font-semibold text-center hover:bg-kezak-dark transition-colors"
              >
                {t('common.continue')}
              </Link>
            </div>
          </div>
        </div>
      )}
      <DeleteBottomSheet
        open={!!confirmDeleteId}
        projectName={projects.find((p: any) => p.id === confirmDeleteId)?.name ?? ''}
        loading={!!deletingId}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
