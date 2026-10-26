/**
 * Shared TypeScript Data Types for Gujjar Petrolium Kot Gujjran
 * Mirrors backend Pydantic models with strict typing and Urdu field annotations.
 */

export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export type TransactionType = 'CREDIT_SALE' | 'PAYMENT' | 'ADJUSTMENT';

export type TransactionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type AdjustmentDirection = 'DEBIT' | 'CREDIT';

export type ReceiptStatus = 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED';

export type ReminderStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export type ReminderType = 'GENTLE' | 'FORMAL' | 'URGENT';

export type MessagingMode = 'DRY_RUN' | 'LIVE';

export type AuditAction = 'CREATE' | 'UPDATE' | 'APPROVE' | 'REJECT' | 'DELETE' | 'LOGIN';

export interface Customer {
  id: string;
  name: string;
  name_ur?: string;
  phone: string;
  status: CustomerStatus;
  credit_limit: string | number;
  opening_balance: string | number;
  current_balance: string | number;
  vehicle_numbers?: string[];
  address?: string;
  notes?: string;
  whatsapp_consent?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Transaction {
  id: string;
  customer_id: string;
  type: TransactionType;
  amount: string | number;
  description: string;
  transaction_date: string;
  fuel_type?: string;
  liters?: string | number;
  rate_per_liter?: string | number;
  vehicle_number?: string;
  slip_number?: string;
  adjustment_direction?: AdjustmentDirection;
  status: TransactionStatus;
  idempotency_key?: string;
  created_by: string;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
}

export interface ReceiptQueue {
  id: string;
  customer_id: string;
  claimed_amount: string | number;
  payment_date: string;
  channel?: string;
  transaction_reference?: string;
  receipt_image_url?: string;
  notes?: string;
  status: ReceiptStatus;
  submitted_at: string;
  verified_by?: string;
  verified_at?: string;
  verification_notes?: string;
  rejection_reason?: string;
  resulting_transaction_id?: string;
}

export interface ReminderLog {
  id: string;
  customer_id: string;
  phone: string;
  reminder_type: ReminderType;
  amount_due: string | number;
  message_text: string;
  message_text_ur: string;
  status: ReminderStatus;
  whatsapp_message_id?: string;
  queued_at: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  error_message?: string;
  dry_run: boolean;
}

export interface ReminderPreviewResponse {
  customer_id: string;
  customer_name: string;
  customer_name_ur?: string;
  phone: string;
  current_balance: string | number;
  days_overdue: number;
  due_date?: string;
  whatsapp_consent: boolean;
  template_name: string;
  template_lang: string;
  template_components: string[];
  rendered_message_ur: string;
  rendered_message_en: string;
  duplicate_warning: boolean;
  last_reminder_at?: string;
  cooldown_days: number;
  can_send: boolean;
  rejection_reasons: string[];
}

export interface BankAccountDetail {
  bank_name: string;
  bank_name_ur?: string;
  account_title: string;
  account_number: string;
  branch_name?: string;
}

export interface SystemSettings {
  business_name: string;
  business_name_ur: string;
  manager_name: string;
  location: string;
  location_ur: string;
  currency: string;
  timezone: string;
  default_language: string;
  messaging_mode: MessagingMode;
  overdue_threshold_days: number;
  cooldown_days_between_reminders: number;
  auto_reminders_enabled: boolean;
  bank_accounts: BankAccountDetail[];
  contact_phone?: string;
}

export interface AuditLog {
  id: string;
  actor_name: string;
  actor_role: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string;
  details: string;
  details_ur?: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  timestamp: string;
}

export interface LedgerEntry {
  transaction_id: string;
  transaction_date: string;
  type: TransactionType;
  description: string;
  fuel_type?: string;
  liters?: string | number;
  rate_per_liter?: string | number;
  vehicle_number?: string;
  slip_number?: string;
  status: TransactionStatus;
  debit_amount: string | number;
  credit_amount: string | number;
  running_balance: string | number;
  is_approved: boolean;
}

export interface CustomerLedgerResponse {
  customer: Customer;
  ledger_entries: LedgerEntry[];
  total_approved_debits: string | number;
  total_approved_credits: string | number;
  outstanding_balance: string | number;
  credit_limit: string | number;
  available_credit: string | number;
  pending_payments_count: number;
  pending_payments_amount: string | number;
  is_overdue: boolean;
  oldest_unpaid_date?: string;
  days_overdue: number;
  generated_at: string;
}

export interface OverdueReportItem {
  customer_id: string;
  customer_name: string;
  customer_name_ur?: string;
  phone: string;
  status: CustomerStatus;
  credit_limit: string | number;
  outstanding_balance: string | number;
  days_overdue: number;
  oldest_unpaid_date?: string;
  last_payment_date?: string;
  whatsapp_consent: boolean;
}

export interface OverdueReportResponse {
  total_overdue_amount: string | number;
  total_overdue_customers: number;
  threshold_days: number;
  customers: OverdueReportItem[];
  generated_at: string;
}

export interface PumpFinancialSummary {
  total_receivables: string | number;
  total_active_customers: number;
  total_overdue_customers: number;
  total_pending_receipts_amount: string | number;
  generated_at: string;
}

export interface APIResponse<T> {
  success: boolean;
  message?: string;
  message_ur?: string;
  data: T;
}

export interface ErrorDetail {
  code: string;
  message: string;
  message_ur?: string;
  field?: string;
}

export interface ErrorResponse {
  success: false;
  error: ErrorDetail;
}
