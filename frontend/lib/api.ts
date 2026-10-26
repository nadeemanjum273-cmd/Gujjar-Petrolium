/**
 * Type-safe API Client for Gujjar Petrolium Kot Gujjran Backend.
 * Supports JWT Bearer authentication, cookie credentials, and Phase 5 endpoints.
 */

import {
  Customer,
  Transaction,
  ReceiptQueue,
  ReminderLog,
  ReminderPreviewResponse,
  SystemSettings,
  AuditLog,
  CustomerLedgerResponse,
  OverdueReportResponse,
  PumpFinancialSummary,
  APIResponse,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const API_PREFIX = process.env.NEXT_PUBLIC_API_V1_PREFIX || '/api/v1';
const DEV_SECRET = 'dev-session-secret-placeholder-min-32-chars';

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  role: 'MANAGER' | 'STAFF' | 'READ_ONLY';
}

export interface LoginResponseData {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
}

export function getStoredToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
}

export function setStoredAuth(token: string, user: UserProfile): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }
}

export function clearStoredAuth(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }
}

export function getStoredUser(): UserProfile | null {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('auth_user');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${API_PREFIX}${endpoint}`;
  const token = getStoredToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Dev-Manager-Secret': DEV_SECRET,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string>),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    cache: 'no-store',
    credentials: 'include', // Sends HTTP-only session cookies
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData?.error?.message || errorData?.detail || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  const result: APIResponse<T> = await response.json();
  return result.data;
}

export const api = {
  // Authentication
  login: async (credentials: { username: string; password: string }) => {
    const res = await fetchAPI<LoginResponseData>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    setStoredAuth(res.access_token, res.user);
    return res;
  },
  logout: async () => {
    try {
      await fetchAPI<any>('/auth/logout', { method: 'POST' });
    } finally {
      clearStoredAuth();
    }
  },
  getMe: () => fetchAPI<UserProfile>('/auth/me'),

  // Health
  getHealth: () => fetch(`${API_BASE_URL}/health`).then((r) => r.json()),

  // Customers
  getCustomers: (search?: string, status?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    const qs = params.toString();
    return fetchAPI<Customer[]>(`/customers${qs ? `?${qs}` : ''}`);
  },
  getCustomer: (id: string) => fetchAPI<Customer>(`/customers/${id}`),
  getCustomerLedger: (id: string) => fetchAPI<CustomerLedgerResponse>(`/customers/${id}/ledger`),
  createCustomer: (data: Partial<Customer>) =>
    fetchAPI<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCustomer: (id: string, data: Partial<Customer>) =>
    fetchAPI<Customer>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deactivateCustomer: (id: string, reason?: string) =>
    fetchAPI<Customer>(`/customers/${id}/deactivate${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`, {
      method: 'POST',
    }),

  // Transactions
  getTransactions: (filters?: { customerId?: string; type?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.customerId) params.append('customer_id', filters.customerId);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    const qs = params.toString();
    return fetchAPI<Transaction[]>(`/transactions${qs ? `?${qs}` : ''}`);
  },
  getTransaction: (id: string) => fetchAPI<Transaction>(`/transactions/${id}`),
  createTransaction: (data: Partial<Transaction>) =>
    fetchAPI<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Reports
  getOverdueReport: (thresholdDays: number = 15) =>
    fetchAPI<OverdueReportResponse>(`/reports/overdue?threshold_days=${thresholdDays}`),
  getPumpSummary: () => fetchAPI<PumpFinancialSummary>('/reports/summary'),

  // Receipts
  getReceipts: () => fetchAPI<ReceiptQueue[]>('/receipts'),
  submitReceipt: (data: Partial<ReceiptQueue>) =>
    fetchAPI<ReceiptQueue>('/receipts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  verifyReceipt: (
    id: string,
    data: { status: 'APPROVED' | 'REJECTED'; verification_notes?: string }
  ) =>
    fetchAPI<ReceiptQueue>(`/receipts/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Reminders
  getReminders: () => fetchAPI<ReminderLog[]>('/reminders'),
  previewReminder: (customerId: string, overrideCooldown: boolean = false) =>
    fetchAPI<ReminderPreviewResponse>('/reminders/preview', {
      method: 'POST',
      body: JSON.stringify({ customer_id: customerId, override_cooldown: overrideCooldown }),
    }),
  sendReminder: (
    customerId: string,
    reminderType: string = 'GENTLE',
    overrideCooldown: boolean = false,
    notes?: string
  ) =>
    fetchAPI<ReminderLog>('/reminders/send', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: customerId,
        reminder_type: reminderType,
        override_cooldown: overrideCooldown,
        notes,
      }),
    }),
  queueReminder: (data: Partial<ReminderLog>) =>
    fetchAPI<ReminderLog>('/reminders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Scheduler
  getSchedulerStatus: () => fetchAPI<any>('/scheduler/status'),
  getSchedulerPreview: () => fetchAPI<any>('/scheduler/preview'),
  runSchedulerNow: () => fetchAPI<any>('/scheduler/run-now', { method: 'POST' }),

  // Settings
  getSettings: () => fetchAPI<SystemSettings>('/settings'),
  updateSettings: (data: Partial<SystemSettings>) =>
    fetchAPI<SystemSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Audit Logs
  getAuditLogs: () => fetchAPI<AuditLog[]>('/audit'),
};
