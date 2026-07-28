import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { PageHeader } from '../components/ui/PageHeader';
import { StatsCard } from '../components/ui/StatsCard';
import { EmptyState, LoadingSkeleton } from '../components/ui/EmptyState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, BarChart3, HelpCircle, Brain, Zap, ShieldAlert, CheckCircle2, Award } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#71717a'];

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);

const Analytics = () => {
  const [data, setData] = useState(null);
  const [aiMetrics, setAiMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [sumRes, aiRes] = await Promise.all([
          api.get('/api/analytics/summary'),
          fetch('http://localhost:8000/api/analytics/ai', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }).then(r => r.ok ? r.json() : null).catch(() => null)
        ]);
        setData(sumRes.data);
        if (aiRes) setAiMetrics(aiRes);
      } catch (error) {
        console.error('Failed to fetch analytics statistics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
        <div className="skeleton" style={{ height: 40, width: 300 }} />
        <div className="stats-strip-3">
          <div className="skeleton" style={{ height: 100 }} />
          <div className="skeleton" style={{ height: 100 }} />
          <div className="skeleton" style={{ height: 100 }} />
        </div>
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  const hasChartData = data?.categories && data.categories.length > 0;
  const avgClaim = data?.summary?.count > 0 ? (data?.summary?.total_submitted / data?.summary?.count) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }} className="animate-fade-up">

      {/* Page Header */}
      <PageHeader
        title="Expense Analytics & AI Intelligence"
        subtitle="Analyze company spending patterns, category volume allocations, and AI automation performance."
        icon={<BarChart3 size={20} />}
      />

      {/* Stats KPI Strip */}
      <div className="stats-strip-3">
        <StatsCard
          label="Total Approved Volume"
          value={formatCurrency((data?.summary?.total_paid || 0) + (data?.summary?.total_pending || 0))}
          subtext="Approved and pending claims"
          icon={<DollarSign size={17} />}
          iconClass="stat-icon-indigo"
        />
        <StatsCard
          label="Disbursed Payments"
          value={formatCurrency(data?.summary?.total_paid)}
          subtext="Total reimbursed to employees"
          icon={<TrendingUp size={17} />}
          iconClass="stat-icon-emerald"
        />
        <StatsCard
          label="Average Claim Size"
          value={formatCurrency(avgClaim)}
          subtext="Per expense submission"
          icon={<BarChart3 size={17} />}
          iconClass="stat-icon-violet"
        />
      </div>

      {/* Enterprise AI Automation Intelligence Banner Card */}
      {aiMetrics && (
        <div className="card-ai" style={{ padding: 'var(--sp-6)' }}>
          <div className="section-header">
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', color: 'var(--violet-400)' }}>
              <Brain size={18} /> Enterprise AI Automation Intelligence
            </div>
            <span className="badge badge-violet">Live Governance</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--sp-4)', marginTop: 'var(--sp-4)' }}>
            <div style={{ padding: 'var(--sp-4)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <CheckCircle2 size={13} style={{ color: 'var(--emerald-400)' }} /> Auto-Approval Rate
              </div>
              <div className="text-mono" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                {Math.round((aiMetrics.ai_auto_approval_rate || 0) * 100)}%
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>Straight-through processing</div>
            </div>

            <div style={{ padding: 'var(--sp-4)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <ShieldAlert size={13} style={{ color: 'var(--amber-400)' }} /> Manager Override Rate
              </div>
              <div className="text-mono" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--amber-400)' }}>
                {Math.round((aiMetrics.manager_override_rate || 0) * 100)}%
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>Human-in-the-loop decisions</div>
            </div>

            <div style={{ padding: 'var(--sp-4)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <DollarSign size={13} style={{ color: 'var(--emerald-400)' }} /> Estimated Savings
              </div>
              <div className="text-mono" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--emerald-400)' }}>
                {formatCurrency(aiMetrics.estimated_ai_savings_usd)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>Fraud prevented & efficiency</div>
            </div>

            <div style={{ padding: 'var(--sp-4)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <Zap size={13} style={{ color: 'var(--violet-400)' }} /> Speedup Factor
              </div>
              <div className="text-mono" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--violet-400)' }}>
                {aiMetrics.processing_speedup_factor}x
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>Faster audit cycle time</div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Layout */}
      {!hasChartData ? (
        <EmptyState
          icon={<BarChart3 size={24} />}
          title="No analytics data available"
          subtitle="Submit and approve expense claims to view spending breakdown charts and trends."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 'var(--sp-6)', alignItems: 'start' }}>

          {/* Monthly Trend Bar Chart */}
          <div className="card" style={{ padding: 'var(--sp-6)' }}>
            <div className="section-header">
              <div className="section-title">Monthly Spending Trend ($)</div>
            </div>
            <div style={{ width: '100%', height: 300, marginTop: 'var(--sp-4)' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--surface-overlay)', borderColor: 'var(--border-default)', color: 'var(--text-primary)', borderRadius: '8px', fontSize: '12px' }}
                    cursor={{ fill: 'var(--surface-hover)' }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Bar dataKey="amount" fill="var(--indigo-500)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Allocation Pie Chart */}
          <div className="card" style={{ padding: 'var(--sp-6)' }}>
            <div className="section-header">
              <div className="section-title">Category Allocations</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)', marginTop: 'var(--sp-4)' }}>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.categories}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {data.categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--surface-overlay)', borderColor: 'var(--border-default)', color: 'var(--text-primary)', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {data.categories.map((entry, index) => (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: COLORS[index % COLORS.length] }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{entry.name}</span>
                    </div>
                    <span className="text-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {formatCurrency(entry.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default Analytics;
