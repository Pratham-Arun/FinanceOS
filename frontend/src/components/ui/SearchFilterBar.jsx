import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

/**
 * SearchFilterBar — Combined search + multiple filter selects
 * Props:
 *   searchValue      - string
 *   onSearchChange   - function(value)
 *   searchPlaceholder - string
 *   filters          - [{ key, label, value, options: [{ value, label }] }]
 *   onFilterChange   - function(key, value)
 *   actions          - ReactNode (right side buttons)
 *   resultCount      - number (optional)
 */
export function SearchFilterBar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters = [],
  onFilterChange,
  actions,
  resultCount,
}) {
  return (
    <div className="filter-bar">
      <div className="search-field">
        <Search size={14} className="search-icon" />
        <input
          className="field-input"
          style={{ paddingLeft: 34, height: 34, fontSize: 'var(--text-sm)' }}
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={e => onSearchChange?.(e.target.value)}
        />
      </div>

      {filters.map(f => (
        <select
          key={f.key}
          className="filter-select"
          value={f.value}
          onChange={e => onFilterChange?.(f.key, e.target.value)}
          aria-label={f.label}
        >
          <option value="">{f.label}</option>
          {f.options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ))}

      {resultCount !== undefined && (
        <span style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--text-tertiary)',
          marginLeft: 'auto',
          whiteSpace: 'nowrap',
        }}>
          {resultCount} result{resultCount !== 1 ? 's' : ''}
        </span>
      )}

      {actions && (
        <div style={{ display: 'flex', gap: 'var(--sp-2)', marginLeft: resultCount !== undefined ? 0 : 'auto' }}>
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * TabBar — Horizontal tab navigation
 * Props:
 *   tabs  - [{ key, label, count?, icon? }]
 *   active - string key
 *   onChange - function(key)
 */
export function TabBar({ tabs, active, onChange }) {
  return (
    <div className="tab-bar">
      {tabs.map(tab => (
        <button
          key={tab.key}
          className={`tab ${active === tab.key ? 'active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.icon && <span style={{ display: 'flex', alignItems: 'center' }}>{tab.icon}</span>}
          {tab.label}
          {tab.count !== undefined && (
            <span className="tab-badge">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export default SearchFilterBar;
