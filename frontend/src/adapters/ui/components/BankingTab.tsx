import { useEffect, useState } from 'react';
import type { ComplianceBalance, BankRecords, Route } from '../../../core/domain/types';
import { ComplianceApiAdapter, BankingApiAdapter, RouteApiAdapter } from '../../infrastructure/apiAdapters';

const routeApi = new RouteApiAdapter();
const compApi = new ComplianceApiAdapter();
const bankApi = new BankingApiAdapter();

interface State {
  shipId: string;
  year: number;
  routes: Route[];
  cb: ComplianceBalance | null;
  records: BankRecords | null;
  lastResult: string;
  applyAmount: string;
  loading: boolean;
  error: string;
}

export default function BankingTab() {
  const [state, setState] = useState<State>({
    shipId: 'R001', year: 2024, routes: [], cb: null, records: null,
    lastResult: '', applyAmount: '', loading: false, error: ''
  });

  const set = (patch: Partial<State>) => setState(s => ({ ...s, ...patch }));

  const validShipIds = Array.from(new Set(state.routes.map(r => r.routeId))).sort();
  const validYears = Array.from(new Set(state.routes.map(r => r.year))).sort();
  const validShipIdsForYear = Array.from(
    new Set(state.routes.filter(r => r.year === state.year).map(r => r.routeId))
  ).sort();
  const hasSelectedRoute = state.routes.some(
    r => r.routeId === state.shipId && r.year === state.year
  );

  useEffect(() => {
    const loadRoutes = async () => {
      try {
        const routes = await routeApi.getAll();
        set({ routes });
        if (routes.length > 0) {
          const initialRoute = routes[0];
          set({ shipId: initialRoute.routeId, year: initialRoute.year });
        }
      } catch (e: unknown) {
        set({ error: (e as Error).message });
      }
    };
    loadRoutes();
  }, []);

  useEffect(() => {
    if (state.routes.length === 0) return;
    if (!hasSelectedRoute) {
      const fallback = state.routes.find(r => r.year === state.year)
        ?? state.routes.find(r => r.routeId === state.shipId)
        ?? state.routes[0];
      if (fallback) {
        set({ shipId: fallback.routeId, year: fallback.year, cb: null, records: null });
      }
    }
  }, [state.shipId, state.year, state.routes, hasSelectedRoute]);

  const fetchData = async (shipId = state.shipId, year = state.year) => {
    set({ loading: true, error: '', lastResult: '' });
    try {
      const [cb, records] = await Promise.all([
        compApi.getCB(shipId, year),
        bankApi.getRecords(shipId, year),
      ]);
      set({ cb, records, loading: false });
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false });
    }
  };

  const handleBank = async () => {
    set({ loading: true, error: '' });
    try {
      const result = await bankApi.bank(state.shipId, state.year);
      set({ lastResult: `✓ Banked ${result.banked.toFixed(0)} gCO₂e`, loading: false });
      await fetchData();
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false });
    }
  };

  const handleApply = async () => {
    const amount = parseFloat(state.applyAmount);
    if (isNaN(amount) || amount <= 0) { set({ error: 'Enter a valid positive amount' }); return; }
    set({ loading: true, error: '' });
    try {
      const result = await bankApi.apply(state.shipId, state.year, amount);
      set({
        lastResult: `✓ Applied ${result.applied.toFixed(0)} gCO₂e · CB: ${result.cbBefore.toFixed(0)} → ${result.cbAfter.toFixed(0)}`,
        applyAmount: '',
        loading: false,
      });
      await fetchData();
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false });
    }
  };

  const cbVal = state.cb?.cb ?? 0;
  const totalBanked = state.records?.totalBanked ?? 0;
  const canBank = cbVal > 0;
  const canApply = totalBanked > 0;

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--accent)', letterSpacing: '0.05em' }}>BANKING — ART. 20</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>Bank surplus Compliance Balance for future use · FuelEU Maritime Regulation</p>
      </div>

      {/* Ship selector */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.08em' }}>SHIP / ROUTE ID</label>
          <select value={state.shipId} onChange={e => set({ shipId: e.target.value, cb: null, records: null })}>
            {validShipIdsForYear.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.08em' }}>YEAR</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {validYears.map(y => (
              <button
                key={y}
                type="button"
                className={state.year === y ? 'btn btn-primary' : 'btn btn-outline'}
                onClick={() => set({ year: y, cb: null, records: null })}
                disabled={state.loading}
                style={{ minWidth: 64 }}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => fetchData()} disabled={state.loading || state.routes.length === 0}>
          {state.loading ? '...' : 'Fetch CB'}
        </button>
      </div>

      {!hasSelectedRoute && state.routes.length > 0 && (
        <div style={{ marginTop: -8, marginBottom: 16, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          The selected ship has no route record for {state.year}. The selector has been moved to a valid ship/year pair for that year.
        </div>
      )}

      {state.error && <div className="error-bar" style={{ marginBottom: 16 }}>{state.error}</div>}
      {state.lastResult && (
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: 16, fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--success)' }}>
          {state.lastResult}
        </div>
      )}

      {state.cb && (
        <>
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
            {[
              { label: 'Compliance Balance', value: cbVal, unit: 'gCO₂e' },
              { label: 'Total Banked', value: totalBanked, unit: 'gCO₂e' },
              { label: 'GHG Intensity', value: state.cb.actualIntensity, unit: 'gCO₂e/MJ', noColor: true },
              { label: 'Target Intensity', value: state.cb.targetIntensity, unit: 'gCO₂e/MJ', noColor: true },
            ].map(k => (
              <div key={k.label} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 8 }}>{k.label.toUpperCase()}</div>
                <div className="kpi-value" style={!k.noColor ? { color: k.value > 0 ? 'var(--success)' : 'var(--danger)' } : {}}>
                  {k.value >= 0 && !k.noColor ? '+' : ''}{k.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{k.unit}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Bank surplus */}
            <div className={`card ${canBank ? 'card-accent' : ''}`} style={{ padding: '1.5rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: canBank ? 'var(--accent)' : 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.05em' }}>BANK SURPLUS</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                {canBank
                  ? `Bank ${cbVal.toFixed(0)} gCO₂e surplus for use in future compliance years.`
                  : 'No surplus available to bank. CB must be positive.'}
              </p>
              <button className="btn btn-primary" onClick={handleBank} disabled={!canBank || state.loading}>
                Bank {canBank ? `${cbVal.toFixed(0)} gCO₂e` : 'Surplus'}
              </button>
            </div>

            {/* Apply banked */}
            <div className={`card ${canApply ? '' : ''}`} style={{ padding: '1.5rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: canApply ? 'var(--accent-2)' : 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.05em' }}>APPLY BANKED</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                {canApply
                  ? `${totalBanked.toFixed(0)} gCO₂e available to apply to current deficit.`
                  : 'No banked surplus available.'}
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  value={state.applyAmount}
                  onChange={e => set({ applyAmount: e.target.value })}
                  placeholder="Amount gCO₂e"
                  disabled={!canApply}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-outline" onClick={handleApply} disabled={!canApply || state.loading || !state.applyAmount}>
                  Apply
                </button>
              </div>
            </div>
          </div>

          {/* Bank entries */}
          {(state.records?.records.length ?? 0) > 0 && (
            <div className="card" style={{ marginTop: 20 }}>
              <div style={{ padding: '1rem 1rem 0', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>BANK LEDGER</div>
              <table>
                <thead>
                  <tr>
                    <th>Entry ID</th>
                    <th>Ship</th>
                    <th>Year</th>
                    <th>Amount (gCO₂e)</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {state.records!.records.map(r => (
                    <tr key={r.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{r.id.slice(0, 8)}…</td>
                      <td>{r.shipId}</td>
                      <td>{r.year}</td>
                      <td style={{ color: 'var(--success)' }}>+{r.amountGco2eq.toLocaleString()}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{new Date(r.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
