// Core domain types — no React or framework dependencies

export interface Route {
  id: string;
  routeId: string;
  vesselType: string;
  fuelType: string;
  year: number;
  ghgIntensity: number;
  fuelConsumption: number;
  distance: number;
  totalEmissions: number;
  isBaseline: boolean;
}

export interface RouteComparison {
  baseline: Route;
  comparison: Route;
  percentDiff: number;
  compliant: boolean;
}

export interface ComplianceBalance {
  shipId: string;
  year: number;
  cb: number;
  energyInScope: number;
  targetIntensity: number;
  actualIntensity: number;
}

export interface AdjustedCB {
  shipId: string;
  year: number;
  cbRaw: number;
  bankedSurplus: number;
  adjustedCb: number;
}

export interface BankEntry {
  id: string;
  shipId: string;
  year: number;
  amountGco2eq: number;
  createdAt: string;
}

export interface BankRecords {
  records: BankEntry[];
  totalBanked: number;
}

export interface BankResult {
  banked: number;
  entry: BankEntry;
}

export interface ApplyResult {
  cbBefore: number;
  applied: number;
  cbAfter: number;
}

export interface PoolMember {
  poolId: string;
  shipId: string;
  cbBefore: number;
  cbAfter: number;
}

export interface Pool {
  id: string;
  year: number;
  members: PoolMember[];
  createdAt: string;
}

export type VesselType = 'Container' | 'BulkCarrier' | 'Tanker' | 'RoRo' | 'All';
export type FuelType = 'HFO' | 'LNG' | 'MGO' | 'All';

export interface RouteFilters {
  vesselType: VesselType;
  fuelType: FuelType;
  year: number | 'All';
}
