import { db } from './connection';

const routes = [
  { routeId: 'R001', vesselType: 'Container',   fuelType: 'HFO', year: 2024, ghgIntensity: 91.0,  fuelConsumption: 5000, distance: 12000, totalEmissions: 4500, isBaseline: true },
  { routeId: 'R002', vesselType: 'BulkCarrier', fuelType: 'LNG', year: 2024, ghgIntensity: 88.0,  fuelConsumption: 4800, distance: 11500, totalEmissions: 4200, isBaseline: false },
  { routeId: 'R003', vesselType: 'Tanker',      fuelType: 'MGO', year: 2024, ghgIntensity: 93.5,  fuelConsumption: 5100, distance: 12500, totalEmissions: 4700, isBaseline: false },
  { routeId: 'R004', vesselType: 'RoRo',        fuelType: 'HFO', year: 2025, ghgIntensity: 89.2,  fuelConsumption: 4900, distance: 11800, totalEmissions: 4300, isBaseline: false },
  { routeId: 'R005', vesselType: 'Container',   fuelType: 'LNG', year: 2025, ghgIntensity: 90.5,  fuelConsumption: 4950, distance: 11900, totalEmissions: 4400, isBaseline: false },
];

async function seed(): Promise<void> {
  console.log('Seeding database...');

  for (const r of routes) {
    await db.query(`
      INSERT INTO routes (route_id, vessel_type, fuel_type, year, ghg_intensity, fuel_consumption, distance, total_emissions, is_baseline)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT ON CONSTRAINT routes_route_id_year_key DO UPDATE SET
        vessel_type = EXCLUDED.vessel_type,
        fuel_type = EXCLUDED.fuel_type,
        ghg_intensity = EXCLUDED.ghg_intensity,
        fuel_consumption = EXCLUDED.fuel_consumption,
        distance = EXCLUDED.distance,
        total_emissions = EXCLUDED.total_emissions,
        is_baseline = EXCLUDED.is_baseline
    `, [r.routeId, r.vesselType, r.fuelType, r.year, r.ghgIntensity, r.fuelConsumption, r.distance, r.totalEmissions, r.isBaseline]);
  }

  console.log(`Seeded ${routes.length} routes.`);
  await db.end();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
