import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell
} from 'recharts';
import type { RouteComparison } from '../../../core/domain/types';
import { RouteApiAdapter } from '../../infrastructure/apiAdapters';

const api = new RouteApiAdapter();

export default function CompareTab() {
  const [data, setData] = useState<RouteComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setData(await api.getComparison());
      } catch (e: unknown) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const targetIntensity = data.length > 0
    ? (data[0].baseline.year >= 2025 ? 89.3368 : 91.16)
    : 89.3368;

  const chartData = data.length > 0
    ? [
        { name: data[0].baseline.routeId + ' (BL)', ghg: data[0].baseline.ghgIntensity, isBaseline: true, compliant: false },
        ...data.map(d => ({ name: d.comparison.routeId, ghg: d.comparison.ghgIntensity, isBaseline: false, compliant: d.compliant })),
      ]
    : [];

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; ghg: number; compliant?: boolean } }> }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="card" style={{ padding: '0.75rem 1rem', minWidth: 160 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent)', marginBottom: 4 }}>{d.name}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem' }}>{d.ghg.toFixed(2)} <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>gCO₂e/MJ</span></div>
        {d.compliant != null && (
          <div style={{ marginTop: 4, fontSize: '0.75rem', color: d.compliant ? 'var(--success)' : 'var(--danger)' }}>
            {d.compliant ? '✓ Compliant' : '✗ Non-compliant'}
          </div>
        )}
      </div>
    );
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--accent)', letterSpacing: '0.05em' }}>GHG INTENSITY COMPARISON</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
          Baseline vs fleet · Target: <span style={{ color: 'var(--accent)' }}>{targetIntensity.toFixed(4)} gCO₂e/MJ</span> ({targetIntensity === 89.3368 ? '2025+' : '2024'})
        </p>
      </div>

      {error && <div className="error-bar" style={{ marginBottom: 16 }}>{error}</div>}

      {data.length === 0 && !error ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No baseline set. Go to Routes tab and set a baseline first.
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: '0.08em' }}>
              GHG INTENSITY (gCO₂e/MJ) — RED DASHED LINE = REGULATORY TARGET ({targetIntensity})
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[85, 96]} tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <ReferenceLine y={targetIntensity} stroke="var(--danger)" strokeDasharray="6 3" strokeWidth={1.5}
                  label={{ value: `Target ${targetIntensity}`, position: 'right', fill: 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: 10 }} />
                <Bar dataKey="ghg" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.isBaseline ? 'var(--accent-2)' : (entry.compliant ? 'var(--success)' : 'var(--danger)')}
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              {[
                { color: 'var(--accent-2)', label: 'Baseline' },
                { color: 'var(--success)', label: 'Compliant' },
                { color: 'var(--danger)', label: 'Non-compliant' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: 'inline-block' }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Baseline Route</th>
                  <th>Comparison Route</th>
                  <th>Baseline GHG</th>
                  <th>Comparison GHG</th>
                  <th>% Difference</th>
                  <th>Compliant</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--accent-2)' }}>{d.baseline.routeId}</td>
                    <td style={{ color: 'var(--accent)' }}>{d.comparison.routeId}</td>
                    <td>{d.baseline.ghgIntensity.toFixed(2)}</td>
                    <td style={{ color: d.comparison.ghgIntensity > (d.comparison.year >= 2025 ? 89.3368 : 91.16) ? 'var(--danger)' : 'var(--success)' }}>
                      {d.comparison.ghgIntensity.toFixed(2)}
                    </td>
                    <td style={{ color: d.percentDiff > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {d.percentDiff > 0 ? '+' : ''}{d.percentDiff.toFixed(2)}%
                    </td>
                    <td>
                      {d.compliant
                        ? <span className="badge badge-success">✅ YES</span>
                        : <span className="badge badge-danger">❌ NO</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
