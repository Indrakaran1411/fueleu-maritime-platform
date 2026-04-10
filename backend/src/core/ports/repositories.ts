// Outbound ports — interfaces the core uses, implemented by adapters

import {
  Route,
  ComplianceBalance,
  BankEntry,
  Pool,
  PoolMember,
  ShipCompliance,
} from '../domain/entities';

export interface RouteRepository {
  findAll(): Promise<Route[]>;
  findById(id: string): Promise<Route | null>;
  findBaseline(): Promise<Route | null>;
  setBaseline(id: string): Promise<Route>;
}

export interface ComplianceRepository {
  upsert(balance: Omit<ShipCompliance, 'id'>): Promise<ShipCompliance>;
  findByShipAndYear(shipId: string, year: number): Promise<ShipCompliance | null>;
}

export interface BankRepository {
  findByShipAndYear(shipId: string, year: number): Promise<BankEntry[]>;
  getTotalBanked(shipId: string, year: number): Promise<number>;
  create(entry: Omit<BankEntry, 'id' | 'createdAt'>): Promise<BankEntry>;
  deductBanked(shipId: string, year: number, amount: number): Promise<void>;
}

export interface PoolRepository {
  create(year: number, members: Array<{ shipId: string; cbBefore: number; cbAfter: number }>): Promise<Pool>;
  findById(id: string): Promise<Pool | null>;
  findAll(): Promise<Pool[]>;
}
