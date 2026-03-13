'use client';

import { useEffect, useState } from 'react';
import { AXIOS_INSTANCE as api } from '@/api/axios-instance';
import {
  Users, Briefcase, UserPlus, TrendingUp, ShieldCheck, UserCog,
  FolderOpen, FileCheck, FileClock, FileSearch, FileX, FileEdit,
  ClipboardList, Clock, CheckCircle2, XCircle, EyeOff,
  Banknote, CreditCard, Unlock, AlertCircle, RotateCcw,
  Shield, AlertTriangle, Activity, MousePointerClick, Eye, Search, UserCheck,
  Globe, Monitor, Smartphone, Tablet, CalendarDays,
  LayoutDashboard, BarChart3, Zap, Bell, Save, Loader2,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ─── Types ──────────────────────────────────────────────

interface Kpis {
  users: { total: number; admins: number; founders: number; candidates: number; unassigned: number; newThisWeek: number; banned: number };
  projects: { total: number; published: number; draft: number; pendingAi: number; analyzingDoc: number; rejected: number; archivedByAdmin: number };
  applications: { total: number; pending: number; accepted: number; rejected: number; ignored: number };
  revenue: {
    totalXAF: number; thisMonthXAF: number;
    transactions: { total: number; paid: number; pending: number; failed: number; refunded: number };
    unlockCount: number;
  };
  moderation: { pendingProfiles: number; pendingProjects: number; rejectedToday: number };
  engagement: { totalInteractions: number; interactionsThisWeek: number; activeUsersThisWeek: number; totalSearches: number; searchesThisWeek: number };
  visits: { total: number; thisWeek: number; today: number; uniqueVisitorsThisWeek: number; byDevice: Record<string, number> };
}

// ─── Constants ──────────────────────────────────────────

const TABS = [
  { key: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { key: 'engagement', label: 'Engagement & Visites', icon: Zap },
  { key: 'revenue', label: 'Revenus', icon: Banknote },
  { key: 'charts', label: 'Graphiques', icon: BarChart3 },
  { key: 'notifications', label: 'Notifications', icon: Bell },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const NOTIFICATION_TYPES = [
  { value: 'SYSTEM', label: 'Système' },
  { value: 'APPLICATION_RECEIVED', label: 'Candidature reçue' },
  { value: 'APPLICATION_ACCEPTED', label: 'Candidature acceptée' },
  { value: 'APPLICATION_REJECTED', label: 'Candidature rejetée' },
  { value: 'MODERATION_ALERT', label: 'Alerte modération' },
  { value: 'DOCUMENT_ANALYZED', label: 'Document analysé' },
  { value: 'DOCUMENT_ANALYSIS_FAILED', label: 'Analyse échouée' },
  { value: 'PROFILE_PUBLISHED', label: 'Profil publié' },
  { value: 'PROFILE_REVIEW', label: 'Profil en review' },
  { value: 'PROFILE_UNLOCKED', label: 'Profil déverrouillé' },
] as const;

// ─── Shared Components ─────────────────────────────────

function formatXAF(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value) + ' XAF';
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

function StatCard({ label, value, icon: Icon, color, bg }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold text-gray-900 mb-3">{children}</h2>;
}

function SumCheck({ total, parts }: { total: number; parts: number[] }) {
  const sum = parts.reduce((a, b) => a + b, 0);
  if (sum !== total) {
    return (
      <p className="text-xs text-red-500 mt-1 col-span-full">
        Incohérence : total ({total}) != somme des statuts ({sum})
      </p>
    );
  }
  return null;
}

// ─── Page ───────────────────────────────────────────────

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('overview');

  useEffect(() => {
    api.get('/admin/kpis')
      .then((res) => setKpis(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-3" />
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <p className="text-gray-600">Impossible de charger les KPIs</p>
      </div>
    );
  }

  const totalPendingMod = kpis.moderation.pendingProfiles + kpis.moderation.pendingProjects;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Vue d&apos;ensemble de la plateforme MojiraX</p>
      </div>

      {/* Alerte modération */}
      {totalPendingMod > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
          <Shield className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-900">Modération en attente</h3>
            <p className="text-sm text-amber-700 mt-1">
              {kpis.moderation.pendingProfiles} profil(s) et {kpis.moderation.pendingProjects} projet(s) à reviewer.
              {kpis.moderation.rejectedToday > 0 && ` ${kpis.moderation.rejectedToday} rejeté(s) aujourd'hui.`}
            </p>
            <a href="/admin/moderation" className="inline-block mt-2 text-sm font-semibold text-amber-700 hover:text-amber-900 underline">
              Voir la file de modération
            </a>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              tab === t.key
                ? 'bg-white text-kezak-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab kpis={kpis} />}
      {tab === 'engagement' && <EngagementTab kpis={kpis} />}
      {tab === 'revenue' && <RevenueTab kpis={kpis} />}
      {tab === 'charts' && <ChartsTab kpis={kpis} />}
      {tab === 'notifications' && <NotificationsTab />}
    </div>
  );
}

// ─── Tab: Vue d'ensemble ────────────────────────────────

function OverviewTab({ kpis }: { kpis: Kpis }) {
  return (
    <div className="space-y-8">
      {/* Utilisateurs */}
      <div>
        <SectionTitle>Utilisateurs ({kpis.users.total})</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total" value={kpis.users.total} icon={Users} color="text-blue-600" bg="bg-blue-50" />
          <StatCard label="Fondateurs" value={kpis.users.founders} icon={Briefcase} color="text-indigo-600" bg="bg-indigo-50" />
          <StatCard label="Candidats" value={kpis.users.candidates} icon={UserPlus} color="text-purple-600" bg="bg-purple-50" />
          <StatCard label="Admins" value={kpis.users.admins} icon={ShieldCheck} color="text-red-600" bg="bg-red-50" />
          <StatCard label="Non assignés" value={kpis.users.unassigned} icon={UserCog} color="text-gray-500" bg="bg-gray-50" />
          <StatCard label="Nouveaux (7j)" value={kpis.users.newThisWeek} icon={TrendingUp} color="text-green-600" bg="bg-green-50" />
          <StatCard label="Bannis" value={kpis.users.banned} icon={Shield} color="text-red-600" bg="bg-red-50" />
          <SumCheck total={kpis.users.total} parts={[kpis.users.founders, kpis.users.candidates, kpis.users.admins, kpis.users.unassigned]} />
        </div>
      </div>

      {/* Projets */}
      <div>
        <SectionTitle>Projets ({kpis.projects.total})</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total" value={kpis.projects.total} icon={FolderOpen} color="text-gray-600" bg="bg-gray-50" />
          <StatCard label="Publiés" value={kpis.projects.published} icon={FileCheck} color="text-green-600" bg="bg-green-50" />
          <StatCard label="Brouillons" value={kpis.projects.draft} icon={FileEdit} color="text-gray-500" bg="bg-gray-50" />
          <StatCard label="En attente IA" value={kpis.projects.pendingAi} icon={FileClock} color="text-amber-600" bg="bg-amber-50" />
          <StatCard label="Analyse doc" value={kpis.projects.analyzingDoc} icon={FileSearch} color="text-blue-600" bg="bg-blue-50" />
          <StatCard label="Rejetés" value={kpis.projects.rejected} icon={FileX} color="text-red-600" bg="bg-red-50" />
          <StatCard label="Archivés (admin)" value={kpis.projects.archivedByAdmin} icon={FileX} color="text-orange-600" bg="bg-orange-50" />
          <SumCheck total={kpis.projects.total} parts={[kpis.projects.published, kpis.projects.draft, kpis.projects.pendingAi, kpis.projects.analyzingDoc, kpis.projects.rejected]} />
        </div>
      </div>

      {/* Candidatures */}
      <div>
        <SectionTitle>Candidatures ({kpis.applications.total})</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Total" value={kpis.applications.total} icon={ClipboardList} color="text-gray-600" bg="bg-gray-50" />
          <StatCard label="En attente" value={kpis.applications.pending} icon={Clock} color="text-amber-600" bg="bg-amber-50" />
          <StatCard label="Acceptées" value={kpis.applications.accepted} icon={CheckCircle2} color="text-green-600" bg="bg-green-50" />
          <StatCard label="Rejetées" value={kpis.applications.rejected} icon={XCircle} color="text-red-600" bg="bg-red-50" />
          <StatCard label="Ignorées" value={kpis.applications.ignored} icon={EyeOff} color="text-gray-500" bg="bg-gray-50" />
          <SumCheck total={kpis.applications.total} parts={[kpis.applications.pending, kpis.applications.accepted, kpis.applications.rejected, kpis.applications.ignored]} />
        </div>
      </div>

      {/* Modération */}
      <div>
        <SectionTitle>Modération</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Profils en attente" value={kpis.moderation.pendingProfiles} icon={Shield} color="text-amber-600" bg="bg-amber-50" />
          <StatCard label="Projets en attente" value={kpis.moderation.pendingProjects} icon={Shield} color="text-orange-600" bg="bg-orange-50" />
          <StatCard label="Rejetés aujourd'hui" value={kpis.moderation.rejectedToday} icon={XCircle} color="text-red-600" bg="bg-red-50" />
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Engagement & Visites ──────────────────────────

function EngagementTab({ kpis }: { kpis: Kpis }) {
  return (
    <div className="space-y-8">
      {/* Engagement */}
      <div>
        <SectionTitle>Engagement</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Interactions totales" value={kpis.engagement.totalInteractions} icon={Activity} color="text-indigo-600" bg="bg-indigo-50" />
          <StatCard label="Interactions (7j)" value={kpis.engagement.interactionsThisWeek} icon={MousePointerClick} color="text-blue-600" bg="bg-blue-50" />
          <StatCard label="Utilisateurs actifs (7j)" value={kpis.engagement.activeUsersThisWeek} icon={UserCheck} color="text-green-600" bg="bg-green-50" />
          <StatCard label="Recherches totales" value={kpis.engagement.totalSearches} icon={Search} color="text-purple-600" bg="bg-purple-50" />
          <StatCard label="Recherches (7j)" value={kpis.engagement.searchesThisWeek} icon={Eye} color="text-cyan-600" bg="bg-cyan-50" />
        </div>
      </div>

      {/* Visites */}
      <div>
        <SectionTitle>Visites</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard label="Visites totales" value={kpis.visits.total} icon={Globe} color="text-teal-600" bg="bg-teal-50" />
          <StatCard label="Cette semaine" value={kpis.visits.thisWeek} icon={CalendarDays} color="text-blue-600" bg="bg-blue-50" />
          <StatCard label="Aujourd'hui" value={kpis.visits.today} icon={Activity} color="text-green-600" bg="bg-green-50" />
          <StatCard label="Visiteurs uniques (7j)" value={kpis.visits.uniqueVisitorsThisWeek} icon={UserCheck} color="text-indigo-600" bg="bg-indigo-50" />
        </div>

        {/* Répartition par device */}
        {Object.keys(kpis.visits.byDevice).length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Répartition par appareil</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(kpis.visits.byDevice).map(([device, count]) => {
                const DeviceIcon = device === 'MOBILE' ? Smartphone : device === 'TABLET' ? Tablet : Monitor;
                return (
                  <div key={device} className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
                    <DeviceIcon className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">{device}</p>
                      <p className="text-lg font-bold text-gray-900">{count}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Revenus ───────────────────────────────────────

function RevenueTab({ kpis }: { kpis: Kpis }) {
  const tx = kpis.revenue.transactions;

  return (
    <div className="space-y-8">
      {/* Revenus */}
      <div>
        <SectionTitle>Revenus</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Revenus total" value={formatXAF(kpis.revenue.totalXAF)} icon={Banknote} color="text-emerald-600" bg="bg-emerald-50" />
          <StatCard label="Ce mois" value={formatXAF(kpis.revenue.thisMonthXAF)} icon={Banknote} color="text-green-600" bg="bg-green-50" />
          <StatCard label="Unlocks" value={kpis.revenue.unlockCount} icon={Unlock} color="text-purple-600" bg="bg-purple-50" />
        </div>
      </div>

      {/* Transactions */}
      <div>
        <SectionTitle>Transactions ({tx.total})</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Total" value={tx.total} icon={CreditCard} color="text-blue-600" bg="bg-blue-50" />
          <StatCard label="Payées" value={tx.paid} icon={CheckCircle2} color="text-green-600" bg="bg-green-50" />
          <StatCard label="En attente" value={tx.pending} icon={Clock} color="text-amber-600" bg="bg-amber-50" />
          <StatCard label="Échouées" value={tx.failed} icon={AlertCircle} color="text-red-600" bg="bg-red-50" />
          <StatCard label="Remboursées" value={tx.refunded} icon={RotateCcw} color="text-blue-600" bg="bg-blue-50" />
          <SumCheck total={tx.total} parts={[tx.paid, tx.pending, tx.failed, tx.refunded]} />
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Notifications Push ─────────────────────────

interface PushConfig {
  enabled: boolean;
  enabledTypes: string[];
  tokenCount: number;
}

function NotificationsTab() {
  const [config, setConfig] = useState<PushConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [enabledTypes, setEnabledTypes] = useState<string[]>([]);

  useEffect(() => {
    api.get('/admin/push-config')
      .then((res) => {
        setConfig(res.data);
        setEnabled(res.data.enabled);
        setEnabledTypes(res.data.enabledTypes);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleType = (type: string) => {
    setEnabledTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const selectAll = () => setEnabledTypes(NOTIFICATION_TYPES.map((t) => t.value));
  const deselectAll = () => setEnabledTypes([]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch('/admin/push-config', { enabled, enabledTypes });
      setConfig({ ...res.data, tokenCount: config?.tokenCount ?? 0 });
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-kezak-primary animate-spin" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <p className="text-gray-600">Impossible de charger la configuration push</p>
      </div>
    );
  }

  const hasChanges = enabled !== config.enabled ||
    JSON.stringify([...enabledTypes].sort()) !== JSON.stringify([...config.enabledTypes].sort());

  return (
    <div className="space-y-8">
      {/* Statut global */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${enabled ? 'bg-green-50' : 'bg-gray-100'}`}>
              <Bell className={`w-6 h-6 ${enabled ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Notifications Push (FCM)</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {config.tokenCount} appareil(s) enregistré(s)
              </p>
            </div>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              enabled ? 'bg-kezak-primary' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Types de notifications */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">Types activés</h3>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-xs text-kezak-primary hover:underline font-medium">
              Tout sélectionner
            </button>
            <span className="text-gray-300">|</span>
            <button onClick={deselectAll} className="text-xs text-gray-500 hover:underline font-medium">
              Tout désélectionner
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {NOTIFICATION_TYPES.map((type) => {
            const isChecked = enabledTypes.includes(type.value);
            return (
              <button
                key={type.value}
                onClick={() => toggleType(type.value)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                  isChecked
                    ? 'border-kezak-primary bg-kezak-light'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                  isChecked ? 'border-kezak-primary bg-kezak-primary' : 'border-gray-300'
                }`}>
                  {isChecked && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm font-medium ${isChecked ? 'text-kezak-dark' : 'text-gray-600'}`}>
                  {type.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bouton sauvegarder */}
      {hasChanges && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 h-[52px] px-8 bg-kezak-primary text-white font-semibold rounded-xl hover:bg-kezak-dark transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Enregistrer
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Graphiques ────────────────────────────────────

function ChartsTab({ kpis }: { kpis: Kpis }) {
  const userDistribution = [
    { name: 'Fondateurs', value: kpis.users.founders },
    { name: 'Candidats', value: kpis.users.candidates },
    { name: 'Admins', value: kpis.users.admins },
    { name: 'Non assignés', value: kpis.users.unassigned },
  ].filter((d) => d.value > 0);

  const projectData = [
    { name: 'Publiés', count: kpis.projects.published, fill: '#22c55e' },
    { name: 'Brouillons', count: kpis.projects.draft, fill: '#94a3b8' },
    { name: 'Attente IA', count: kpis.projects.pendingAi, fill: '#f59e0b' },
    { name: 'Analyse', count: kpis.projects.analyzingDoc, fill: '#3b82f6' },
    { name: 'Rejetés', count: kpis.projects.rejected, fill: '#ef4444' },
  ].filter((d) => d.count > 0);

  const applicationData = [
    { name: 'En attente', value: kpis.applications.pending, fill: '#f59e0b' },
    { name: 'Acceptées', value: kpis.applications.accepted, fill: '#22c55e' },
    { name: 'Rejetées', value: kpis.applications.rejected, fill: '#ef4444' },
    { name: 'Ignorées', value: kpis.applications.ignored, fill: '#94a3b8' },
  ].filter((d) => d.value > 0);

  const userColors = ['#0066ff', '#8b5cf6', '#001f4d', '#94a3b8'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Répartition utilisateurs */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 mb-4">Répartition utilisateurs</h2>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={userDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value">
              {userDistribution.map((_, index) => (
                <Cell key={`u-${index}`} fill={userColors[index % userColors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [value, 'Utilisateurs']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Projets par statut */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 mb-4">Projets par statut</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={projectData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-20} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {projectData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Candidatures */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 mb-4">Candidatures</h2>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={applicationData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value">
              {applicationData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [value, 'Candidatures']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
