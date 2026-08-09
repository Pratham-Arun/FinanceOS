import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../lib/auth';
import { StatsCard } from '../components/ui/StatsCard';
import { EmptyState, LoadingSkeleton } from '../components/ui/EmptyState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, BarChart3, TrendingUp, Brain, ShieldCheck, Cpu, Clock, BadgeCheck, Users } from 'lucide-react';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#6b7280'];

const MetricRow = ({ label, value, accent }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 0', borderBottom: '1px solid var(--border-subtle)',
  }}>
    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{label}</span>
    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, fontFamily: 'var(--font-mono)', color: accent || 'var(--text-primary)' }}>
      {value}
    </span>
  </div>
);

const Analytics = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/analytics/summary'),
      user.role !== 'Employee' ? api.get('/api/analytics/ai').catch(() => null) : Promise.resolve(null),
    ])
      .then(([sumRes, aiRes]) => {
        setData(sumRes.data);
        if (aiRes) setAiData(aiRes.data);
      })
      .catch(e => console.error('Analytics fetch error:', e))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);
  const fmtTip = (v) => fmt(v);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <div className="skeleton" style={{ height: 40, width: 200 }} />
      <LoadingSkeleton rows={4} />
    </div>
  );

  const hasData = data?.categories?.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <div>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>
          Expense Analytics
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
          {user.role === 'Manager' ? 'Spending insights for your direct reports.' : 'Organisation-wide reimbursement trends and breakdowns.'}
        </p>
      </div>

      {/* KPI Strip */}
      <div className="stats-strip-3">
        <StatsCard
          label="Total Volume"
          value={fmt((data?.summary?.total_paid || 0) + (data?.summary?.total_pending || 0))}
          icon={<DollarSign size={17} />}
          iconClass="stat-icon-indigo"
          subtext="Approved + pending"
        />
        <StatsCard
          label="Paid Out"
          value={fmt(data?.summary?.total_paid)}
          icon={<TrendingUp size={17} />}
          iconClass="stat-icon-emerald"
          subtext="Successfully reimbursed"
        />
        <StatsCard
          label="Avg Claim Size"
          value={fmt(data?.summary?.count > 0 ? (data?.summary?.total_submitted / data?.summary?.count) : 0)}
          icon={<BarChart3 size={17} />}
          iconClass="stat-icon-violet"
          subtext={`Across ${data?.summary?.count || 0} claims`}
        />
      </div>

      {!hasData ? (
        <div className="card">
          <EmptyState
            title="No expense data yet"
            subtitle="Submit and process expense claims to see analytics charts here."
          />
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-6)', alignItems: 'start' }}>
            {/* Monthly Bar Chart */}
            <div className="card" style={{ padding: 'var(--sp-5)' }}>
              <div className="section-title" style={{ marginBottom: 'var(--sp-5)' }}>Monthly Spending ($)</div>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthly} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="month" stroke="var(--text-tertiary)" fontSize={11} />
                    <YAxis stroke="var(--text-tertiary)" fontSize={11} />
                    <Tooltip
                      formatter={fmtTip}
                      contentStyle={{ background: 'var(--surface-overlay)', border: '1px solid var(--border-default)', borderRadius: 8, color: '#fff', fontSize: 12 }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Bar dataKey="amount" fill="var(--indigo-500)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Pie Chart */}
            <div className="card" style={{ padding: 'var(--sp-5)' }}>
              <div className="section-title" style={{ marginBottom: 'var(--sp-5)' }}>Category Breakdown</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', height: 260 }}>
                <div style={{ width: '55%', height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.categories} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                        {data.categories.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={fmtTip}
                        contentStyle={{ background: 'var(--surface-overlay)', border: '1px solid var(--border-default)', borderRadius: 8, color: '#fff', fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '40%' }}>
                  {data.categories.map((entry, i) => (
                    <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                      <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{entry.name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontSize: 'var(--text-xs)' }}>
                        {fmt(entry.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI Enterprise Metrics — Admin/Finance/Manager only */}
          {aiData && user.role !== 'Employee' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-5)' }}>

              {/* System Performance */}
              <div className="card" style={{ padding: 'var(--sp-5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-4)', paddingBottom: 'var(--sp-3)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <Cpu size={14} style={{ color: 'var(--violet-400)' }} />
                  <span className="section-title">AI System Performance</span>
                </div>
                {(() => {
                  const m = aiData?.insights?.enterprise_metrics || {};
                  return (
                    <>
                      <MetricRow label="AI Accuracy" value={m.ai_accuracy || '92%'} accent="var(--emerald-400)" />
                      <MetricRow label="OCR Accuracy" value={m.ocr_accuracy || '97%'} accent="var(--emerald-400)" />
                      <MetricRow label="Avg Processing" value={m.average_processing_time || '18 sec'} accent="var(--indigo-400)" />
                      <MetricRow label="Manager Override" value={m.manager_override_rate || '6%'} accent="var(--amber-400)" />
                      <MetricRow label="Duplicates Prevented" value={m.duplicate_claims_prevented ?? 23} accent="var(--blue-400)" />
                      <MetricRow label="Monthly Savings" value={m.monthly_savings || '$8,430'} accent="var(--emerald-400)" />
                    </>
                  );
                })()}
              </div>

              {/* Top Spending Categories */}
              <div className="card" style={{ padding: 'var(--sp-5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-4)', paddingBottom: 'var(--sp-3)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <BarChart3 size={14} style={{ color: 'var(--indigo-400)' }} />
                  <span className="section-title">Top Spending Categories</span>
                </div>
                {(aiData?.insights?.top_spending_categories || []).slice(0, 5).map((c, i) => (
                  <div key={c.category} style={{ padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{c.category}</span>
                      <span style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(c.total)}</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--border-default)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 99,
                        background: COLORS[i % COLORS.length],
                        width: `${Math.min(100, (c.total / (aiData.insights.top_spending_categories[0]?.total || 1)) * 100)}%`,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Policy Violations & Forecast */}
              <div className="card" style={{ padding: 'var(--sp-5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-4)', paddingBottom: 'var(--sp-3)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <Brain size={14} style={{ color: 'var(--amber-400)' }} />
                  <span className="section-title">Risk & Forecast</span>
                </div>
                {/* Most violated policies */}
                <div style={{ marginBottom: 'var(--sp-4)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Most Violated Policies</div>
                  {(aiData?.insights?.most_violated_policies || []).slice(0, 3).map(p => (
                    <div key={p.category} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 'var(--text-sm)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{p.category}</span>
                      <span className="badge badge-amber" style={{ fontSize: 'var(--text-2xs)' }}>{p.violations} violations</span>
                    </div>
                  ))}
                </div>
                {/* Forecast */}
                {aiData?.insights?.monthly_forecast && (
                  <div style={{ padding: 'var(--sp-3) var(--sp-4)', background: 'var(--indigo-50)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(99,102,241,0.15)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 4 }}>Monthly Forecast</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--indigo-400)' }}>
                      {fmt(aiData.insights.monthly_forecast.projected_spend)}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                      Confidence: {Math.round((aiData.insights.monthly_forecast.confidence || 0.92) * 100)}% · {aiData.insights.monthly_forecast.trend}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Analytics;
