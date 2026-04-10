import type {
  Route, RouteComparison, ComplianceBalance, AdjustedCB,
  BankRecords, BankResult, ApplyResult, Pool
} from '../domain/types';

// Outbound ports — implemented by infrastructure adapters

export interface IRouteApi {
  getAll(): Promise<Route[]>;
  setBaseline(routeId: string): Promise<Route>;
  getComparison(): Promise<RouteComparison[]>;
}

export interface IComplianceApi {
  getCB(shipId: string, year: number): Promise<ComplianceBalance>;
  getAdjustedCB(shipId: string, year: number): Promise<AdjustedCB>;
  getAdjustedCBs(year: number): Promise<AdjustedCB[]>;
}

export interface IBankingApi {
  getRecords(shipId: string, year: number): Promise<BankRecords>;
  bank(shipId: string, year: number): Promise<BankResult>;
  apply(shipId: string, year: number, amount: number): Promise<ApplyResult>;
}

export interface IPoolApi {
  create(year: number, shipIds: string[]): Promise<Pool>;
  getAll(): Promise<Pool[]>;
}
