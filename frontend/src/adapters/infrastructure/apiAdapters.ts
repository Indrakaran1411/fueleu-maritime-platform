import type { IRouteApi, IComplianceApi, IBankingApi, IPoolApi } from '../../core/ports/apiPorts';
import type {
  Route, RouteComparison, ComplianceBalance, AdjustedCB,
  BankRecords, BankResult, ApplyResult, Pool
} from '../../core/domain/types';

const BASE = import.meta.env.VITE_API_URL ?? '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

export class RouteApiAdapter implements IRouteApi {
  getAll(): Promise<Route[]> {
    return request('/routes');
  }
  setBaseline(routeId: string): Promise<Route> {
    return request(`/routes/${routeId}/baseline`, { method: 'POST' });
  }
  getComparison(): Promise<RouteComparison[]> {
    return request('/routes/comparison');
  }
}

export class ComplianceApiAdapter implements IComplianceApi {
  getCB(shipId: string, year: number): Promise<ComplianceBalance> {
    return request(`/compliance/cb?shipId=${shipId}&year=${year}`);
  }
  getAdjustedCB(shipId: string, year: number): Promise<AdjustedCB> {
    return request(`/compliance/adjusted-cb?shipId=${shipId}&year=${year}`);
  }
  getAdjustedCBs(year: number): Promise<AdjustedCB[]> {
    return request(`/compliance/adjusted-cb?year=${year}`);
  }
}

export class BankingApiAdapter implements IBankingApi {
  getRecords(shipId: string, year: number): Promise<BankRecords> {
    return request(`/banking/records?shipId=${shipId}&year=${year}`);
  }
  bank(shipId: string, year: number): Promise<BankResult> {
    return request('/banking/bank', { method: 'POST', body: JSON.stringify({ shipId, year }) });
  }
  apply(shipId: string, year: number, amount: number): Promise<ApplyResult> {
    return request('/banking/apply', { method: 'POST', body: JSON.stringify({ shipId, year, amount }) });
  }
}

export class PoolApiAdapter implements IPoolApi {
  create(year: number, shipIds: string[]): Promise<Pool> {
    return request('/pools', { method: 'POST', body: JSON.stringify({ year, shipIds }) });
  }
  getAll(): Promise<Pool[]> {
    return request('/pools');
  }
}
