import React from 'react';
import Sidebar from './Sidebar';
import Topnav from './Topnav';

const AppShell = ({ children }) => {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: 'var(--surface-base)',
    }}>
      {/* Persistent Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0,
      }}>
        {/* Top bar */}
        <Topnav />

        {/* Page content */}
        <main
          id="main-content"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '28px 32px',
          }}
        >
          <div className="animate-fade-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
