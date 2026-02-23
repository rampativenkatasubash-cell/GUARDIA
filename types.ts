
export enum ViolationStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  HELMET_SHIPPED = 'HELMET_SHIPPED',
  GOVERNMENT_REVENUE = 'GOVERNMENT_REVENUE'
}

export interface Owner {
  name: string;
  address: string;
  phone: string;
  totalViolations: number;
}

export interface Violation {
  id: string;
  plateNumber: string;
  timestamp: string;
  imageUrl: string;
  status: ViolationStatus;
  offenseCount: number;
  fineAmount: number;
  owner?: Owner;
}

export interface AnalysisResult {
  hasHelmet: boolean;
  plateNumber: string;
  confidence: number;
}

export interface DashboardStats {
  totalViolations: number;
  totalFinesCollected: number;
  helmetsDelivered: number;
  governmentRevenue: number;
}
