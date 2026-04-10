import { useState } from 'react';
import type { AdjustedCB, Pool } from '../../../core/domain/types';
import { ComplianceApiAdapter, PoolApiAdapter } from '../../infrastructure/apiAdapters';

const compApi = new ComplianceApiAdapter();
const poolApi = new PoolApiAdapter();

interface ShipCBRow extends AdjustedCB { selected: boolean }

export default function PoolingTab() {
  const [year, setYear] = useState(2024);
  const [ships, setShips] = useState<ShipCBRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [createdPool, setCreatedPool] = useState<Pool | null>(null);

  const fetchAdjustedCBs = async () => {
    setLoading(true);
    setError('');
    setCreatedPool(null);
    try {
      const results = await compApi.getAdjustedCBs(year);
      setShips(results.map(r => ({ ...r, selected: false })));
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleShip = (shipId: string) => {
    setShips(prev => prev.map(s => s.shipId === shipId ? { ...s, selected: !s.selected } : s));
  };

  const selected = ships.filter(s => s.selected);
  const poolSum = selected.reduce((sum, s) => sum + s.adjustedCb, 0);
  const poolValid = selected.length >= 2 && poolSum >= 0;

  const handleCreatePool = async () => {
    if (!poolValid) return;
    setCreating(true);
    setError('');
    try {
      const pool = await poolApi.create(year, selected.map(s => s.shipId));
      setCreatedPool(pool);
      setShips(prev => prev.map(s => ({ ...s, selected: false })));
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--accent)', letterSpacing: '0.05em' }}>POOLING — ART. 21</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>Aggregate Compliance Balances across vessels · Greedy surplus allocation</p>
      </div>

      {/* Controls */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.08em' }}>YEAR</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))}>
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={fetchAdjustedCBs} disabled={loading}>
          {loading ? '...' : 'Load Ships'}
        </button>
      </div>

      {error && <div className="error-bar" style={{ marginBottom: 16 }}>{error}</div>}

      {ships.length > 0 && (
        <>
          {/* Pool summary bar */}
          <div className={`card ${poolValid ? 'card-accent' : ''}`} style={{
            padding: '1rem 1.5rem',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderColor: selected.length < 2 ? 'var(--border)' : poolValid ? 'rgba(0,212,170,0.4)' : 'rgba(239,68,68,0.4)',
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 4 }}>POOL TOTAL CB</div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.4rem',
                fontWeight: 700,
                color: selected.length < 2 ? 'var(--text-muted)' : poolSum >= 0 ? 'var(--success)' : 'var(--danger)'
              }}>
                {selected.length === 0 ? '—' : (poolSum >= 0 ? '+' : '') + poolSum.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>gCO₂e</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              {selected.length < 2 && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Select ≥ 2 ships</div>}
              {selected.length >= 2 && !poolValid && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--danger)' }}>∑ CB &lt; 0 — Pool invalid</div>}
              <button
                className="btn btn-primary"
                onClick={handleCreatePool}
                disabled={!poolValid || creating}
              >
                {creating ? 'Creating...' : `Create Pool (${selected.length} ships)`}
              </button>
            </div>
          </div>

          {/* Ship grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
            {ships.map(ship => {
              const cb = ship.adjustedCb;
              return (
                <div
                  key={ship.shipId}
                  className="card"
                  onClick={() => toggleShip(ship.shipId)}
                  style={{
                    padding: '1.25rem',
                    cursor: 'pointer',
                    borderColor: ship.selected
                      ? cb >= 0 ? 'rgba(0,212,170,0.5)' : 'rgba(59,130,246,0.5)'
                      : 'var(--border)',
                    background: ship.selected ? 'rgba(255,255,255,0.05)' : 'var(--card-bg)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent)' }}>{ship.shipId}</span>
                    <span className={`badge ${cb >= 0 ? 'badge-success' : 'badge-danger'}`}>
                      {cb >= 0 ? 'SURPLUS' : 'DEFICIT'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { label: 'Raw CB', val: ship.cbRaw },
                      { label: 'Banked', val: ship.bankedSurplus },
                      { label: 'Adjusted CB', val: ship.adjustedCb, highlight: true },
                    ].map(item => (
                      <div key={item.label} style={item.highlight ? { gridColumn: 'span 2', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 } : {}}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{item.label}</div>
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: item.highlight ? '1.1rem' : '0.85rem',
                          fontWeight: item.highlight ? 700 : 400,
                          color: item.val >= 0 ? 'var(--success)' : 'var(--danger)'
                        }}>
                          {item.val >= 0 ? '+' : ''}{item.val.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 12, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: ship.selected ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {ship.selected ? '✓ SELECTED' : 'click to select'}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Created pool result */}
      {createdPool && (
        <div className="card card-accent" style={{ padding: '1.5rem' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 12 }}>
            ✓ POOL CREATED — {createdPool.id.slice(0, 8)}… · Year {createdPool.year}
          </div>
          <table>
            <thead>
              <tr>
                <th>Ship</th>
                <th>CB Before</th>
                <th>CB After</th>
                <th>Δ Change</th>
              </tr>
            </thead>
            <tbody>
              {createdPool.members.map(m => (
                <tr key={m.shipId}>
                  <td style={{ color: 'var(--accent)' }}>{m.shipId}</td>
                  <td style={{ color: m.cbBefore >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {m.cbBefore >= 0 ? '+' : ''}{m.cbBefore.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ color: m.cbAfter >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {m.cbAfter >= 0 ? '+' : ''}{m.cbAfter.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ color: (m.cbAfter - m.cbBefore) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {(m.cbAfter - m.cbBefore) >= 0 ? '+' : ''}{(m.cbAfter - m.cbBefore).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
