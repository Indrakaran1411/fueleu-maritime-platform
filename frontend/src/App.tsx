import { useState } from 'react';
import RoutesTab from './adapters/ui/components/RoutesTab';
import CompareTab from './adapters/ui/components/CompareTab';
import BankingTab from './adapters/ui/components/BankingTab';
import PoolingTab from './adapters/ui/components/PoolingTab';
import './index.css';

type Tab = 'routes' | 'compare' | 'banking' | 'pooling';

const TABS: { id: Tab; label: string; sub: string }[] = [
  { id: 'routes',  label: 'Routes',  sub: 'Registry' },
  { id: 'compare', label: 'Compare', sub: 'GHG Analysis' },
  { id: 'banking', label: 'Banking', sub: 'Art. 20' },
  { id: 'pooling', label: 'Pooling', sub: 'Art. 21' },
];

export default function App() {
  const [active, setActive] = useState<Tab>('routes');

  return (
    <div style={{ minHeight: '100vh', padding: '0 0 3rem' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '1.5rem 2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        marginBottom: 0,
        background: 'rgba(10,15,30,0.8)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        {/* Logo mark */}
        <div style={{
          width: 36, height: 36,
          background: 'var(--accent)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M3 17L9 11L13 15L21 7" stroke="#0a0f1e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 20h18" stroke="#0a0f1e" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>

        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
            FUELEU MARITIME
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            COMPLIANCE PLATFORM · EU 2023/1805
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', gap: 8 }}>
          {['2024', '2025'].map(y => (
            <span key={y} className="badge badge-neutral">{y}</span>
          ))}
        </div>
      </header>

      {/* Tab navigation */}
      <div style={{ padding: '0 2rem', background: 'rgba(10,15,30,0.6)', borderBottom: '1px solid var(--border)' }}>
        <div className="tab-bar" style={{ marginBottom: 0, borderBottom: 'none' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${active === tab.id ? 'active' : ''}`}
              onClick={() => setActive(tab.id)}
            >
              {tab.label}
              <span style={{ display: 'block', fontSize: '0.55rem', color: active === tab.id ? 'rgba(0,212,170,0.6)' : 'var(--text-muted)', letterSpacing: '0.05em', marginTop: 1 }}>
                {tab.sub}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
        {active === 'routes'  && <RoutesTab />}
        {active === 'compare' && <CompareTab />}
        {active === 'banking' && <BankingTab />}
        {active === 'pooling' && <PoolingTab />}
      </main>
    </div>
  );
}
