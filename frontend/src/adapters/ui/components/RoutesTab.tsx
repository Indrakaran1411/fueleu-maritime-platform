import { useState, useEffect } from 'react';
import type { Route, RouteFilters, VesselType, FuelType } from '../../../core/domain/types';
import { RouteApiAdapter } from '../../infrastructure/apiAdapters';

const api = new RouteApiAdapter();

const VESSEL_TYPES: VesselType[] = ['All', 'Container', 'BulkCarrier', 'Tanker', 'RoRo'];
const FUEL_TYPES: FuelType[] = ['All', 'HFO', 'LNG', 'MGO'];
const YEARS = ['All', 2024, 2025] as const;

export default function RoutesTab() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settingBaseline, setSettingBaseline] = useState<string | null>(null);
  const [filters, setFilters] = useState<RouteFilters>({ vesselType: 'All', fuelType: 'All', year: 'All' });

  const fetchRoutes = async () => {
    setLoading(true);
    setError('');
    try {
      setRoutes(await api.getAll());
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoutes(); }, []);

  const handleSetBaseline = async (routeId: string) => {
    setSettingBaseline(routeId);
    try {
      await api.setBaseline(routeId);
      await fetchRoutes();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSettingBaseline(null);
    }
  };

  const filtered = routes.filter(r =>
    (filters.vesselType === 'All' || r.vesselType === filters.vesselType) &&
    (filters.fuelType === 'All' || r.fuelType === filters.fuelType) &&
    (filters.year === 'All' || r.year === filters.year)
  );

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--accent)', letterSpacing: '0.05em' }}>ROUTE REGISTRY</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>FuelEU Maritime — GHG intensity tracking per voyage</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select value={filters.vesselType} onChange={e => setFilters(f => ({ ...f, vesselType: e.target.value as VesselType }))}>
            {VESSEL_TYPES.map(v => <option key={v}>{v}</option>)}
          </select>
          <select value={filters.fuelType} onChange={e => setFilters(f => ({ ...f, fuelType: e.target.value as FuelType }))}>
            {FUEL_TYPES.map(v => <option key={v}>{v}</option>)}
          </select>
          <select value={filters.year.toString()} onChange={e => setFilters(f => ({ ...f, year: e.target.value === 'All' ? 'All' : Number(e.target.value) }))}>
            {YEARS.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="error-bar" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Route ID</th>
                  <th>Vessel</th>
                  <th>Fuel</th>
                  <th>Year</th>
                  <th>GHG Intensity (gCO₂e/MJ)</th>
                  <th>Consumption (t)</th>
                  <th>Distance (km)</th>
                  <th>Emissions (t)</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(route => (
                  <tr key={route.id}>
                    <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{route.routeId}</td>
                    <td>{route.vesselType}</td>
                    <td>
                      <span className={`badge ${route.fuelType === 'LNG' ? 'badge-success' : route.fuelType === 'HFO' ? 'badge-warning' : 'badge-neutral'}`}>
                        {route.fuelType}
                      </span>
                    </td>
                    <td>{route.year}</td>
                    <td style={{ color: route.ghgIntensity > 89.34 ? 'var(--danger)' : 'var(--success)' }}>
                      {route.ghgIntensity.toFixed(1)}
                    </td>
                    <td>{route.fuelConsumption.toLocaleString()}</td>
                    <td>{route.distance.toLocaleString()}</td>
                    <td>{route.totalEmissions.toLocaleString()}</td>
                    <td>
                      {route.isBaseline
                        ? <span className="badge badge-success">BASELINE</span>
                        : <span className="badge badge-neutral">—</span>}
                    </td>
                    <td>
                      {!route.isBaseline && (
                        <button
                          className="btn btn-outline"
                          onClick={() => handleSetBaseline(route.routeId)}
                          disabled={settingBaseline === route.routeId}
                        >
                          {settingBaseline === route.routeId ? '...' : 'Set Baseline'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No routes match filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
        Target intensity (2025): 89.3368 gCO₂e/MJ · Highlighted red = above target
      </div>
    </div>
  );
}
