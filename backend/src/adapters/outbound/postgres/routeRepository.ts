import { RouteRepository } from '../../../core/ports/repositories';
import { Route } from '../../../core/domain/entities';
import { query, db } from '../../../infrastructure/db/connection';

interface RouteRow {
  id: string;
  route_id: string;
  vessel_type: string;
  fuel_type: string;
  year: number;
  ghg_intensity: string;
  fuel_consumption: string;
  distance: string;
  total_emissions: string;
  is_baseline: boolean;
}

function toRoute(row: RouteRow): Route {
  return {
    id: row.id,
    routeId: row.route_id,
    vesselType: row.vessel_type,
    fuelType: row.fuel_type,
    year: Number(row.year),
    ghgIntensity: parseFloat(row.ghg_intensity),
    fuelConsumption: parseFloat(row.fuel_consumption),
    distance: parseFloat(row.distance),
    totalEmissions: parseFloat(row.total_emissions),
    isBaseline: row.is_baseline,
  };
}

export class PgRouteRepository implements RouteRepository {
  async findAll(): Promise<Route[]> {
    const rows = await query<RouteRow>('SELECT * FROM routes ORDER BY year, route_id');
    return rows.map(toRoute);
  }

  async findById(id: string): Promise<Route | null> {
    const rows = await query<RouteRow>(
      'SELECT * FROM routes WHERE id::text = $1 OR route_id = $1',
      [id]
    );
    return rows.length > 0 ? toRoute(rows[0]) : null;
  }

  async findBaseline(): Promise<Route | null> {
    const rows = await query<RouteRow>('SELECT * FROM routes WHERE is_baseline = TRUE LIMIT 1');
    return rows.length > 0 ? toRoute(rows[0]) : null;
  }

  async setBaseline(id: string): Promise<Route> {
    // Clear existing baseline, set new one
    await db.query('UPDATE routes SET is_baseline = FALSE');
    await db.query(
      'UPDATE routes SET is_baseline = TRUE WHERE id::text = $1 OR route_id = $1',
      [id]
    );
    const route = await this.findById(id);
    if (!route) throw new Error(`Route ${id} not found after setBaseline`);
    return route;
  }
}
