import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, BarChart3, HelpCircle } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#e11d48', '#64748b'];

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get('/api/analytics/summary');
        setData(response.data);
      } catch (error) {
        console.error('Failed to fetch analytics statistics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ height: '32px', width: '200px' }} className="skeleton" />
        <div style={{ height: '90px' }} className="skeleton" />
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
          <div style={{ height: '350px' }} className="skeleton" />
          <div style={{ height: '350px' }} className="skeleton" />
        </div>
      </div>
    );
  }

  const hasChartData = data?.categories && data.categories.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Expense Analytics</h2>
          <p className="page-subtitle">
            Analyze spending patterns, monthly volume trends, and budget category distributions.
          </p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="kpi-strip">
        <div className="kpi-item">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <DollarSign size={13} style={{ color: 'var(--indigo-400)' }} /> Total Volume Approved
          </div>
          <div className="kpi-value">{formatCurrency((data?.summary?.total_paid || 0) + (data?.summary?.total_pending || 0))}</div>
          <div className="kpi-sub">Across all categories</div>
        </div>

        <div className="kpi-item">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={13} style={{ color: 'var(--emerald-400)' }} /> Reimbursed Payments
          </div>
          <div className="kpi-value" style={{ color: 'var(--emerald-400)' }}>{formatCurrency(data?.summary?.total_paid)}</div>
          <div className="kpi-sub">Disbursed to employees</div>
        </div>

        <div className="kpi-item">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BarChart3 size={13} style={{ color: 'var(--violet-400)' }} /> Average Claim Size
          </div>
          <div className="kpi-value">
            {formatCurrency(data?.summary?.count > 0 ? (data?.summary?.total_submitted / data?.summary?.count) : 0)}
          </div>
          <div className="kpi-sub">Per submission</div>
        </div>
      </div>

      {/* Charts Section */}
      {!hasChartData ? (
        <div className="card" style={{ padding: '64px', textAlign: 'center' }}>
          <HelpCircle size={32} style={{ color: 'var(--text-tertiary)', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 'var(--text-md)', fontWeight: 500 }}>No analytics data available</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            Submit and approve claims to view spending breakdown and trends.
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Monthly Bar Chart */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 className="section-title" style={{ marginBottom: '16px' }}>Monthly Spending Trend ($)</h3>
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--surface-overlay)', borderColor: 'var(--border-default)', color: 'var(--text-primary)', borderRadius: '6px', fontSize: '12px' }}
                    cursor={{ fill: 'var(--surface-hover)' }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Bar dataKey="amount" fill="var(--indigo-500)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Pie Chart */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 className="section-title" style={{ marginBottom: '16px' }}>Category Allocations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: '100%', height: '200px' }}>
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
                      contentStyle={{ backgroundColor: 'var(--surface-overlay)', borderColor: 'var(--border-default)', color: 'var(--text-primary)', borderRadius: '6px', fontSize: '12px' }}
                      formatter={(value) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legends list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.categories.map((entry, index) => (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: COLORS[index % COLORS.length] }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{entry.name}</span>
                    </div>
                    <span className="text-mono" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{formatCurrency(entry.value)}</span>
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
