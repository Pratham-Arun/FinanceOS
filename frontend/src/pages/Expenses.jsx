import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import { SearchFilterBar } from '../components/ui/SearchFilterBar';
import { EmptyState, LoadingSkeleton } from '../components/ui/EmptyState';
import { ShieldAlert, ShieldCheck, Brain, ScanLine, BadgeCheck, AlertTriangle } from 'lucide-react';

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0);

const RiskBadge = ({ score }) => {
  if (!score) return <span className="risk-badge risk-low">Low</span>;
  const cls = score === 'High' ? 'risk-high' : score === 'Medium' ? 'risk-medium' : 'risk-low';
  return (
    <span className={`risk-badge ${cls}`}>
      {score === 'High' && <ShieldAlert size={10} />}
      {score === 'Low' && <ShieldCheck size={10} />}
      {score}
    </span>
  );
};

const AIRecBadge = ({ rec }) => {
  if (!rec) return <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>—</span>;
  const r = rec.toLowerCase();
  if (r.includes('auto')) return <span className="badge badge-emerald" style={{ fontSize: 'var(--text-2xs)' }}>AUTO APPROVE</span>;
  if (r.includes('manual') || r.includes('invest')) return <span className="badge badge-crimson" style={{ fontSize: 'var(--text-2xs)' }}>INVESTIGATE</span>;
  return <span className="badge badge-amber" style={{ fontSize: 'var(--text-2xs)' }}>REVIEW</span>;
};

const PolicyBadge = ({ status }) => {
  if (!status) return <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>—</span>;
  return status === 'PASS'
    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--emerald-400)', fontSize: 'var(--text-xs)' }}><BadgeCheck size={11} /> Pass</span>
    : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--crimson-400)', fontSize: 'var(--text-xs)' }}><AlertTriangle size={11} /> Violation</span>;
};


const Expenses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState(searchParams.get('tab') === 'high-risk' ? 'High' : '');
  const [policyFilter, setPolicyFilter] = useState('');

  useEffect(() => {
    api.get('/api/expenses')
      .then(r => setExpenses(r.data))
      .catch(e => console.error('Expenses fetch error:', e))
      .finally(() => setLoading(false));
  }, []);

  const isReviewer = user.role === 'Manager' || user.role === 'Finance' || user.role === 'Admin';

  const filtered = expenses.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      e.title?.toLowerCase().includes(q) ||
      e.employee_name?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q);
    const matchStatus = !statusFilter || e.status === statusFilter;
    const matchCat = !categoryFilter || e.category === categoryFilter;
    const matchRisk = !riskFilter || e.risk_score === riskFilter;
    const matchPolicy = !policyFilter || (e.rule_engine?.policy_status || (e.risk_flags?.length > 0 ? 'VIOLATION' : 'PASS')) === policyFilter;
    return matchSearch && matchStatus && matchCat && matchRisk && matchPolicy;
  });

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <div className="skeleton" style={{ height: 40, width: 220 }} />
      <LoadingSkeleton rows={6} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>
            {user.role === 'Finance' ? 'Payments Queue' : user.role === 'Manager' ? 'Approvals' : 'My Claims'}
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
            {filtered.length} of {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
          </p>
        </div>
        {user.role === 'Employee' && (
          <button onClick={() => navigate('/submit')} className="btn btn-primary btn-md">
            Submit Claim
          </button>
        )}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <SearchFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by title, submitter, or category…"
          filters={[
            {
              key: 'status', label: 'All Statuses', value: statusFilter,
              options: [
                { value: 'Draft', label: 'Draft' },
                { value: 'Submitted', label: 'Submitted' },
                { value: 'Under Review', label: 'Under Review' },
                { value: 'Approved', label: 'Approved' },
                { value: 'Paid', label: 'Paid' },
                { value: 'Rejected', label: 'Rejected' },
              ]
            },
            {
              key: 'category', label: 'All Categories', value: categoryFilter,
              options: [
                { value: 'Meals', label: 'Meals' },
                { value: 'Travel', label: 'Travel' },
                { value: 'Accommodation', label: 'Accommodation' },
                { value: 'Supplies', label: 'Supplies' },
                { value: 'Other', label: 'Other' },
              ]
            },
            {
              key: 'risk', label: 'All Risk Levels', value: riskFilter,
              options: [
                { value: 'High', label: 'High Risk' },
                { value: 'Medium', label: 'Medium Risk' },
                { value: 'Low', label: 'Low Risk' },
              ]
            },
            {
              key: 'policy', label: 'Policy Status', value: policyFilter,
              options: [
                { value: 'PASS', label: 'Policy Pass' },
                { value: 'VIOLATION', label: 'Policy Violation' },
              ]
            },
          ]}
          onFilterChange={(key, val) => {
            if (key === 'status') setStatusFilter(val);
            else if (key === 'category') setCategoryFilter(val);
            else if (key === 'risk') setRiskFilter(val);
            else if (key === 'policy') setPolicyFilter(val);
          }}
          resultCount={filtered.length}
        />


        {filtered.length === 0 ? (
          <EmptyState
            title="No claims found"
            subtitle={
              search || statusFilter || categoryFilter || riskFilter || policyFilter
                ? 'Try adjusting your filters.'
                : 'No reimbursement claims have been submitted yet.'
            }
            action={user.role === 'Employee' ? (
              <button onClick={() => navigate('/submit')} className="btn btn-primary btn-sm">
                Submit First Claim
              </button>
            ) : null}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  {isReviewer && <th>Submitter</th>}
                  <th>Title</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Risk</th>
                  <th>AI Rec.</th>
                  <th>Policy</th>
                  <th className="col-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => {
                  const aiRec = e.ai_analysis?.recommendation;
                  const policyStatus = e.rule_engine?.policy_status ||
                    (e.risk_flags?.length > 0 ? 'VIOLATION' : 'PASS');
                  return (
                    <tr key={e.id} onClick={() => navigate(`/expense/${e.id}`)}>
                      <td style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', whiteSpace: 'nowrap' }}>
                        {e.expense_date}
                      </td>
                      {isReviewer && (
                        <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{e.employee_name}</td>
                      )}
                      <td style={{ fontWeight: 500, maxWidth: 200 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.title}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-slate" style={{ fontSize: 'var(--text-2xs)' }}>{e.category}</span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {fmt(e.amount)}
                      </td>
                      <td><StatusBadge status={e.status} /></td>
                      <td><RiskBadge score={e.risk_score} /></td>
                      <td><AIRecBadge rec={aiRec} /></td>
                      <td><PolicyBadge status={policyStatus} /></td>
                      <td className="col-right">
                        <button className="btn btn-ghost btn-xs row-actions" style={{ color: 'var(--indigo-400)' }}>
                          Review →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Expenses;
