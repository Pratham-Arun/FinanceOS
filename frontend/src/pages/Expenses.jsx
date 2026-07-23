import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import { Search, Calendar, ChevronRight, Plus, Download, SlidersHorizontal } from 'lucide-react';

const Expenses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [dense, setDense] = useState(false);

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

  useEffect(() => {
    fetchExpenses();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  };

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = (e.title || '').toLowerCase().includes(search.toLowerCase()) || 
                          (e.employee_name || '').toLowerCase().includes(search.toLowerCase()) ||
                          (e.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || e.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ height: '32px', width: '200px' }} className="skeleton" />
        <div style={{ height: '48px' }} className="skeleton" />
        <div style={{ height: '400px' }} className="skeleton" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Reimbursement Claims</h2>
          <p className="page-subtitle">
            Search, filter, and track status for all expense reimbursement records across the company.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {user?.role === 'Employee' && (
            <button onClick={() => navigate('/submit')} className="btn btn-primary btn-md">
              <Plus size={15} /> New Claim
            </button>
          )}
        </div>
      </div>

      {/* Main Data Card */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Filter Toolbar */}
        <div className="filter-bar">
          <div className="search-field">
            <span className="search-icon"><Search size={14} /></span>
            <input
              type="text"
              className="field-input"
              style={{ fontSize: 'var(--text-sm)' }}
              placeholder="Search vendor, title, or submitter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Approved">Approved</option>
              <option value="Paid">Paid</option>
              <option value="Rejected">Rejected</option>
            </select>

            <select
              className="filter-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              <option value="Meals">Meals</option>
              <option value="Travel">Travel</option>
              <option value="Accommodation">Accommodation</option>
              <option value="Supplies">Supplies</option>
              <option value="Other">Other</option>
            </select>

            <button
              onClick={() => setDense(!dense)}
              className="btn btn-ghost btn-sm"
              title="Toggle Compact View"
              style={{ color: dense ? 'var(--indigo-400)' : 'var(--text-tertiary)', padding: '6px 8px' }}
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>
        </div>

        {/* Data Table */}
        {filteredExpenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No reimbursement claims match your criteria</div>
            <div className="empty-state-sub">Try clearing filters or search terms.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
            <table className={`data-table ${dense ? 'dense' : ''}`}>
              <thead>
                <tr>
                  <th>Date</th>
                  {(user?.role === 'Manager' || user?.role === 'Finance' || user?.role === 'Admin') && (
                    <th>Submitter</th>
                  )}
                  <th>Claim Title</th>
                  <th>Category</th>
                  <th className="col-right">Amount</th>
                  <th>Status</th>
                  <th className="col-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map(e => (
                  <tr key={e.id}>
                    <td className="col-mono" style={{ color: 'var(--text-tertiary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={13} style={{ color: 'var(--text-tertiary)' }} />
                        {e.expense_date}
                      </div>
                    </td>
                    {(user?.role === 'Manager' || user?.role === 'Finance' || user?.role === 'Admin') && (
                      <td style={{ fontWeight: 500 }}>{e.employee_name}</td>
                    )}
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{e.title}</div>
                      {e.description && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
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
                    <td>
                      <StatusBadge status={e.status} size="sm" />
                    </td>
                    <td className="col-right">
                      <button
                        onClick={() => navigate(`/expense/${e.id}`)}
                        className="btn btn-secondary btn-xs row-actions"
                      >
                        Details <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--border-default)',
          background: 'var(--surface-inset)',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-tertiary)'
        }}>
          <div>Showing {filteredExpenses.length} of {expenses.length} claims</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>Total Value: <strong className="text-mono" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(filteredExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0))}
            </strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Expenses;
