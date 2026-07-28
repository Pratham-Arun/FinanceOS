import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import { StatusPill, RiskBadge } from '../components/ui/RiskBadge';
import { PageHeader } from '../components/ui/PageHeader';
import { TabBar } from '../components/ui/SearchFilterBar';
import { SearchFilterBar } from '../components/ui/SearchFilterBar';
import { EmptyState, LoadingSkeleton } from '../components/ui/EmptyState';
import {
  Calendar, ChevronRight, Plus, SlidersHorizontal,
  Brain, FileText, DollarSign, Clock, CheckCircle2
} from 'lucide-react';

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

const Expenses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [dense, setDense] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'high-risk') {
      setActiveTab('HIGH_RISK');
    }
  }, [location.search]);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const response = await api.get('/api/expenses');
        setExpenses(response.data || []);
      } catch (error) {
        console.error('Failed to load expenses:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchExpenses();
  }, []);

  const isPrivileged = user?.role === 'Manager' || user?.role === 'Finance' || user?.role === 'Admin';

  const pendingCount = expenses.filter(e => e.status === 'Submitted' || e.status === 'Under Review').length;
  const highRiskCount = expenses.filter(e => e.status === 'Under Review' || e.amount > 1000 || e.risk_score === 'High' || e.risk_score === 'Critical').length;

  const tabs = [
    { key: 'ALL', label: 'All Claims', count: expenses.length },
    ...(isPrivileged ? [
      { key: 'PENDING', label: 'Awaiting Review', count: pendingCount },
      { key: 'HIGH_RISK', label: 'High-Risk AI Queue', count: highRiskCount, icon: <Brain size={13} style={{ color: 'var(--crimson-400)' }} /> },
    ] : []),
  ];

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = (e.title || '').toLowerCase().includes(search.toLowerCase()) ||
                          (e.employee_name || '').toLowerCase().includes(search.toLowerCase()) ||
                          (e.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || e.status === statusFilter;
    const matchesCategory = !categoryFilter || e.category === categoryFilter;

    let matchesTab = true;
    if (activeTab === 'PENDING') {
      matchesTab = e.status === 'Submitted' || e.status === 'Under Review';
    } else if (activeTab === 'HIGH_RISK') {
      matchesTab = e.status === 'Under Review' || e.amount > 1000 || e.risk_score === 'High' || e.risk_score === 'Critical';
    }

    return matchesSearch && matchesStatus && matchesCategory && matchesTab;
  });

  const totalFilteredAmount = filteredExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
        <div className="skeleton" style={{ height: 40, width: 280 }} />
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }} className="animate-fade-up">

      {/* Page Header */}
      <PageHeader
        title="Reimbursement Claims"
        subtitle="Search, filter, and review all expense reimbursement records across the company."
        icon={<FileText size={20} />}
        actions={
          user?.role === 'Employee' ? (
            <button onClick={() => navigate('/submit')} className="btn btn-primary btn-md">
              <Plus size={15} strokeWidth={2.5} /> New Claim
            </button>
          ) : null
        }
      />

      {/* Tabs bar */}
      {isPrivileged && (
        <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
      )}

      {/* Main Table Card */}
      <div className="card" style={{ overflow: 'hidden' }}>

        {/* Toolbar */}
        <SearchFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search title, vendor, or submitter…"
          filters={[
            {
              key: 'status',
              label: 'All Statuses',
              value: statusFilter,
              options: [
                { value: 'Draft', label: 'Draft' },
                { value: 'Submitted', label: 'Submitted' },
                { value: 'Under Review', label: 'Under Review' },
                { value: 'Approved', label: 'Approved' },
                { value: 'Paid', label: 'Paid' },
                { value: 'Rejected', label: 'Rejected' },
              ],
            },
            {
              key: 'category',
              label: 'All Categories',
              value: categoryFilter,
              options: [
                { value: 'Meals', label: 'Meals' },
                { value: 'Travel', label: 'Travel' },
                { value: 'Accommodation', label: 'Accommodation' },
                { value: 'Supplies', label: 'Supplies' },
                { value: 'Other', label: 'Other' },
              ],
            },
          ]}
          onFilterChange={(key, val) => {
            if (key === 'status') setStatusFilter(val);
            if (key === 'category') setCategoryFilter(val);
          }}
          resultCount={filteredExpenses.length}
          actions={
            <button
              onClick={() => setDense(!dense)}
              className="btn btn-ghost btn-sm"
              title="Toggle Compact Mode"
              style={{ color: dense ? 'var(--indigo-400)' : 'var(--text-tertiary)' }}
            >
              <SlidersHorizontal size={14} />
            </button>
          }
        />

        {/* Table */}
        {filteredExpenses.length === 0 ? (
          <EmptyState
            title="No matching reimbursement claims"
            subtitle="Try clearing search filters or selecting a different tab."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={`data-table ${dense ? 'dense' : ''}`}>
              <thead>
                <tr>
                  <th>Date</th>
                  {isPrivileged && <th>Submitter</th>}
                  <th>Claim Details</th>
                  <th>Category</th>
                  <th className="col-right">Amount</th>
                  {isPrivileged && <th>AI Risk</th>}
                  <th>Status</th>
                  <th className="col-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map(e => {
                  const riskLevel = e.risk_score?.toLowerCase() || (e.amount > 1000 ? 'high' : 'low');
                  return (
                    <tr key={e.id} onClick={() => navigate(`/expense/${e.id}`)}>
                      <td className="col-mono" style={{ color: 'var(--text-tertiary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={12} style={{ color: 'var(--text-tertiary)' }} />
                          {e.expense_date}
                        </div>
                      </td>
                      {isPrivileged && (
                        <td style={{ fontWeight: 500 }}>{e.employee_name}</td>
                      )}
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{e.title}</div>
                        {e.description && (
                          <div style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-tertiary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 240,
                          }}>
                            {e.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-slate">{e.category}</span>
                      </td>
                      <td className="col-mono col-right" style={{ fontWeight: 600 }}>
                        {formatCurrency(e.amount)}
                      </td>
                      {isPrivileged && (
                        <td>
                          <RiskBadge level={riskLevel} score={e.fraud_score} />
                        </td>
                      )}
                      <td>
                        <StatusPill status={e.status?.toLowerCase().replace(' ', '_') || 'draft'} label={e.status} />
                      </td>
                      <td className="col-right">
                        <button
                          onClick={ev => { ev.stopPropagation(); navigate(`/expense/${e.id}`); }}
                          className="btn btn-secondary btn-xs row-actions"
                        >
                          View <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer Summary */}
        <div style={{
          padding: 'var(--sp-3) var(--sp-5)',
          borderTop: '1px solid var(--border-default)',
          background: 'var(--surface-inset)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-tertiary)',
        }}>
          <div>Showing {filteredExpenses.length} of {expenses.length} claims</div>
          <div style={{ display: 'flex', gap: 'var(--sp-4)' }}>
            <span>Filtered Total: <strong className="text-mono" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(totalFilteredAmount)}
            </strong></span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Expenses;
