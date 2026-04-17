'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '@/context/i18n-context';
import { AXIOS_INSTANCE as api } from '@/api/axios-instance';
import {
  Brain, Activity, Settings, FileText, ScrollText,
  CheckCircle2, XCircle, Clock, DollarSign,
  ChevronLeft, ChevronRight, RefreshCw, Save, RotateCcw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

// ─── Types ──────────────────────────────────────────────

interface Analytics {
  callsToday: number;
  callsPeriod: number;
  successRate: number;
  avgDurationMs: number;
  costThisMonthUsd: number;
  byProvider: { provider: string; count: number }[];
  byAction: { action: string; count: number }[];
  recentErrors: {
    id: string;
    action: string;
    provider: string;
    model: string;
    error: string | null;
    durationMs: number;
    createdAt: string;
  }[];
  period: number;
}

interface AiConfig {
  id: string;
  defaultProvider: string;
  embeddingProvider: string;
  providerPerAction: Record<string, string>;
  models: Record<string, string>;
  maxTokens: number;
  temperature: number;
  moderationThresholds: Record<string, number> | null;
  matchingWeights: Record<string, number> | null;
}

interface AiPrompt {
  action: string;
  content: string;
  version: number;
  previousVersions: { version: number; content: string; updatedAt: string }[];
  updatedAt: string;
}

interface LogEntry {
  id: string;
  action: string;
  provider: string;
  model: string;
  success: boolean;
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number | null;
  error: string | null;
  resourceType: string | null;
  resourceId: string | null;
  createdAt: string;
}

// ─── Constants ──────────────────────────────────────────

const PIE_COLORS = ['#0066ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const ACTION_KEYS: Record<string, { labelKey: string; descKey: string }> = {
  EXTRACTION: { labelKey: 'ai_action_extraction', descKey: 'ai_action_extraction_desc' },
  SUMMARY: { labelKey: 'ai_action_summary', descKey: 'ai_action_summary_desc' },
  REGENERATION: { labelKey: 'ai_action_regeneration', descKey: 'ai_action_regeneration_desc' },
  LEGALITY: { labelKey: 'ai_action_legality', descKey: 'ai_action_legality_desc' },
  PROJECT_VALIDATION: { labelKey: 'ai_action_project_validation', descKey: 'ai_action_project_validation_desc' },
  CANDIDATE_VALIDATION: { labelKey: 'ai_action_candidate_validation', descKey: 'ai_action_candidate_validation_desc' },
  EMBEDDING: { labelKey: 'ai_action_embedding', descKey: 'ai_action_embedding_desc' },
};

// ─── Page ───────────────────────────────────────────────

export default function AdminAiPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<string>('dashboard');

  const getActionLabel = (action: string) => {
    const key = ACTION_KEYS[action];
    return key ? t(`admin.${key.labelKey}`) : action;
  };

  const TABS = [
    { key: 'dashboard', label: t('admin.ai_tab_dashboard'), icon: Activity },
    { key: 'config', label: t('admin.ai_tab_config'), icon: Settings },
    { key: 'prompts', label: t('admin.ai_tab_prompts'), icon: FileText },
    { key: 'logs', label: t('admin.ai_tab_logs'), icon: ScrollText },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <Brain className="w-7 h-7 text-kezak-primary" />
          {t('admin.ai_title')}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{t('admin.ai_subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              tab === tabItem.key
                ? 'bg-white text-kezak-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tabItem.icon className="w-4 h-4" />
            {tabItem.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab getActionLabel={getActionLabel} />}
      {tab === 'config' && <ConfigTab getActionLabel={getActionLabel} />}
      {tab === 'prompts' && <PromptsTab getActionLabel={getActionLabel} />}
      {tab === 'logs' && <LogsTab getActionLabel={getActionLabel} />}
    </div>
  );
}

// ─── Dashboard Tab ──────────────────────────────────────

function DashboardTab({ getActionLabel }: { getActionLabel: (a: string) => string }) {
  const { t } = useTranslation();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(7);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/ai/analytics', { params: { days: period } });
      setAnalytics(data);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading || !analytics) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  const kpis = [
    { label: t('admin.ai_calls_today'), value: analytics.callsToday, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: t('admin.ai_success_rate', { days: period }), value: `${analytics.successRate}%`, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: t('admin.ai_avg_duration'), value: `${(analytics.avgDurationMs / 1000).toFixed(1)}s`, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: t('admin.ai_cost_this_month'), value: `$${analytics.costThisMonthUsd.toFixed(4)}`, icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 justify-end">
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            onClick={() => setPeriod(d)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              period === d
                ? 'bg-kezak-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {d}j
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <span className="text-xs text-gray-500">{kpi.label}</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('admin.ai_calls_by_action')}</h3>
          {analytics.byAction.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.byAction.map((a) => ({ ...a, label: getActionLabel(a.action) }))}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0066ff" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">{t('admin.ai_no_data')}</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('admin.ai_by_provider')}</h3>
          {analytics.byProvider.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ResponsiveContainer width="100%" height={200} className="sm:!w-1/2">
                <PieChart>
                  <Pie data={analytics.byProvider} dataKey="count" nameKey="provider" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                    {analytics.byProvider.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {analytics.byProvider.map((p, i) => (
                  <div key={p.provider} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-gray-600">{p.provider}</span>
                    <span className="font-semibold text-gray-900">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">{t('admin.ai_no_data')}</p>
          )}
        </div>
      </div>

      {analytics.recentErrors.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            {t('admin.ai_recent_errors')}
          </h3>
          <div className="space-y-3">
            {analytics.recentErrors.map((err) => (
              <div key={err.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-red-50/50 rounded-lg text-sm">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-xs font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded">{err.action}</span>
                  <span className="text-gray-500">{err.provider}</span>
                  <span className="text-gray-400 truncate">{err.error}</span>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(err.createdAt).toLocaleString('fr-FR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Config Tab ─────────────────────────────────────────

function ConfigTab({ getActionLabel }: { getActionLabel: (a: string) => string }) {
  const { t } = useTranslation();
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedProviders, setEditedProviders] = useState<Record<string, string>>({});
  const [editedModels, setEditedModels] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get('/admin/ai/config')
      .then(({ data }) => {
        setConfig(data);
        setEditedProviders(data.providerPerAction || {});
        setEditedModels(data.models || {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/admin/ai/config', {
        providerPerAction: editedProviders,
        models: editedModels,
      });
      setConfig(data);
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return <div className="h-64 bg-white rounded-2xl border border-gray-100 animate-pulse" />;
  }

  const ACTIONS = ['EXTRACTION', 'SUMMARY', 'REGENERATION', 'LEGALITY', 'PROJECT_VALIDATION', 'CANDIDATE_VALIDATION'];
  const PROVIDERS = ['DEEPSEEK', 'CLAUDE', 'GPT'];
  const MODEL_KEYS = Object.keys(editedModels);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('admin.ai_provider_per_action')}</h3>
        <div className="space-y-4">
          {ACTIONS.map((action) => {
            const meta = ACTION_KEYS[action];
            return (
              <div key={action} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                <div className="sm:w-72 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{meta ? t(`admin.${meta.labelKey}`) : action}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{meta ? t(`admin.${meta.descKey}`) : ''}</p>
                </div>
                <select
                  value={editedProviders[action] || 'DEEPSEEK'}
                  onChange={(e) => setEditedProviders({ ...editedProviders, [action]: e.target.value })}
                  className="h-[40px] px-3 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary sm:w-44"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('admin.ai_models')}</h3>
        <div className="space-y-3">
          {MODEL_KEYS.map((key) => (
            <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span className="text-sm text-gray-600 sm:w-48 font-medium">{key}</span>
              <input
                type="text"
                value={editedModels[key]}
                onChange={(e) => setEditedModels({ ...editedModels, [key]: e.target.value })}
                className="h-[40px] px-3 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary flex-1"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 h-[44px] px-6 bg-kezak-primary text-white rounded-xl text-sm font-semibold hover:bg-kezak-primary/90 disabled:opacity-50 transition-all duration-200"
        >
          <Save className="w-4 h-4" />
          {saving ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </div>
  );
}

// ─── Prompts Tab ────────────────────────────────────────

function PromptsTab({ getActionLabel }: { getActionLabel: (a: string) => string }) {
  const { t } = useTranslation();
  const [prompts, setPrompts] = useState<AiPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/ai/prompts');
      setPrompts(data);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrompts(); }, [fetchPrompts]);

  const selectPrompt = (action: string) => {
    const prompt = prompts.find((p) => p.action === action);
    if (prompt) {
      setSelectedAction(action);
      setEditContent(prompt.content);
      setShowHistory(false);
    }
  };

  const handleSave = async () => {
    if (!selectedAction) return;
    setSaving(true);
    try {
      await api.patch(`/admin/ai/prompts/${selectedAction}`, { content: editContent });
      await fetchPrompts();
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  };

  const handleRollback = async (version: number) => {
    if (!selectedAction) return;
    setSaving(true);
    try {
      await api.post(`/admin/ai/prompts/${selectedAction}/rollback`, { version });
      await fetchPrompts();
      const updated = prompts.find((p) => p.action === selectedAction);
      if (updated) setEditContent(updated.content);
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  };

  const selectedPrompt = prompts.find((p) => p.action === selectedAction);

  if (loading) {
    return <div className="h-64 bg-white rounded-2xl border border-gray-100 animate-pulse" />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('admin.ai_prompts_actions')}</h3>
        <div className="space-y-1">
          {prompts.map((p) => {
            const meta = ACTION_KEYS[p.action];
            return (
              <button
                key={p.action}
                onClick={() => selectPrompt(p.action)}
                className={`w-full text-left px-3 py-3 rounded-lg text-sm transition-all ${
                  selectedAction === p.action
                    ? 'bg-kezak-primary/10 text-kezak-primary'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{meta ? t(`admin.${meta.labelKey}`) : p.action}</span>
                  <span className="text-xs text-gray-400">v{p.version}</span>
                </div>
                {meta && (
                  <p className={`text-xs mt-0.5 ${selectedAction === p.action ? 'text-kezak-primary/70' : 'text-gray-400'}`}>
                    {t(`admin.${meta.descKey}`)}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        {selectedAction && selectedPrompt ? (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {getActionLabel(selectedAction)}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t('admin.ai_prompts_version', { version: selectedPrompt.version, date: new Date(selectedPrompt.updatedAt).toLocaleString('fr-FR') })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {t('admin.ai_prompts_history')}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || editContent === selectedPrompt.content}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-kezak-primary text-white hover:bg-kezak-primary/90 disabled:opacity-50 transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? t('common.saving') : t('common.save')}
                  </button>
                </div>
              </div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={16}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm text-gray-900 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
              />
            </div>

            {showHistory && selectedPrompt.previousVersions && selectedPrompt.previousVersions.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('admin.ai_prompts_history_title')}</h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {[...selectedPrompt.previousVersions].reverse().map((v) => (
                    <div key={v.version} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700">
                          Version {v.version} — {new Date(v.updatedAt).toLocaleString('fr-FR')}
                        </span>
                        <button
                          onClick={() => handleRollback(v.version)}
                          disabled={saving}
                          className="text-xs text-kezak-primary hover:underline disabled:opacity-50"
                        >
                          {t('admin.ai_prompts_restore')}
                        </button>
                      </div>
                      <pre className="text-xs text-gray-500 whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {v.content.substring(0, 500)}{v.content.length > 500 ? '...' : ''}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 shadow-sm text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">{t('admin.ai_prompts_select_action')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Logs Tab ───────────────────────────────────────────

function LogsTab({ getActionLabel }: { getActionLabel: (a: string) => string }) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [successFilter, setSuccessFilter] = useState('');

  const PAGE_SIZE = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { take: PAGE_SIZE, skip: page * PAGE_SIZE };
      if (actionFilter) params.action = actionFilter;
      if (providerFilter) params.provider = providerFilter;
      if (successFilter) params.success = successFilter;
      const { data } = await api.get('/admin/ai/logs', { params });
      setLogs(data.logs);
      setTotal(data.total);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, providerFilter, successFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
          className="h-[40px] px-3 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
        >
          <option value="">{t('admin.ai_logs_all_actions')}</option>
          {Object.entries(ACTION_KEYS).map(([k, v]) => (
            <option key={k} value={k}>{t(`admin.${v.labelKey}`)}</option>
          ))}
        </select>
        <select
          value={providerFilter}
          onChange={(e) => { setProviderFilter(e.target.value); setPage(0); }}
          className="h-[40px] px-3 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
        >
          <option value="">{t('admin.ai_logs_all_providers')}</option>
          <option value="DEEPSEEK">DeepSeek</option>
          <option value="CLAUDE">Claude</option>
          <option value="GPT">GPT</option>
          <option value="JINA">Jina</option>
          <option value="OPENAI_EMBEDDING">OpenAI Embedding</option>
        </select>
        <select
          value={successFilter}
          onChange={(e) => { setSuccessFilter(e.target.value); setPage(0); }}
          className="h-[40px] px-3 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary"
        >
          <option value="">{t('admin.ai_logs_all_statuses')}</option>
          <option value="true">{t('admin.ai_logs_success')}</option>
          <option value="false">{t('admin.ai_logs_error')}</option>
        </select>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 h-[40px] px-4 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm font-medium transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          {t('admin.ai_logs_refresh')}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('admin.ai_logs_col_action')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('admin.ai_logs_col_provider')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('admin.ai_logs_col_model')}</th>
                <th className="text-center px-3 py-3 font-medium text-gray-500">{t('admin.ai_logs_col_status')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">{t('admin.ai_logs_col_duration')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">{t('admin.ai_logs_col_tokens')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">{t('admin.ai_logs_col_cost')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('admin.ai_logs_col_date')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500">
                    <ScrollText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    {t('admin.ai_logs_no_logs')}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{log.provider}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono truncate max-w-[150px]">{log.model}</td>
                    <td className="px-3 py-3 text-center">
                      {log.success ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <span title={log.error || ''}>
                          <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {(log.durationMs / 1000).toFixed(1)}s
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">
                      {log.inputTokens || log.outputTokens ? (
                        <span>{log.inputTokens || 0} / {log.outputTokens || 0}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 text-xs">
                      {log.estimatedCostUsd != null ? `$${log.estimatedCostUsd.toFixed(6)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('fr-FR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              {t('admin.ai_logs_total', { total })} — {t('admin.page_of', { current: page + 1, total: totalPages })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
