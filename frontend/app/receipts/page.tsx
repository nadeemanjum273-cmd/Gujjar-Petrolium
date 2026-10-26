'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { api } from '@/lib/api';
import { formatPKR, formatKarachiDate, formatKarachiDateTime } from '@/lib/formatters';
import { ReceiptQueue, ReceiptStatus } from '@/types';

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptQueue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Verification modal state
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptQueue | null>(null);
  const [actionType, setActionType] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getReceipts();
      setReceipts(data);
    } catch (err: any) {
      setError(err?.message || 'رسیدوں کا ریکارڈ لوڈ کرنے میں ناکامی ہوئی۔');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, []);

  const handleOpenVerify = (receipt: ReceiptQueue, type: 'APPROVED' | 'REJECTED') => {
    setSelectedReceipt(receipt);
    setActionType(type);
    setVerificationNotes(
      type === 'APPROVED' ? 'بینک اکاؤنٹ کریڈٹ تصدیق شدہ' : 'رسید واضح نہیں یا رقم نامعلوم ہے'
    );
    setVerifyModalOpen(true);
  };

  const handleConfirmVerify = async () => {
    if (!selectedReceipt) return;
    try {
      setVerifying(true);
      setError(null);

      const updated = await api.verifyReceipt(selectedReceipt.id, {
        status: actionType,
        verification_notes: verificationNotes,
      });

      setActionSuccess(
        actionType === 'APPROVED'
          ? `رسید (${selectedReceipt.id}) منظور ہو گئی اور کسٹمر کے کھاتے میں خودکار ادائیگی درج ہو گئی۔`
          : `رسید (${selectedReceipt.id}) مسترد کر دی گئی۔`
      );

      setVerifyModalOpen(false);
      loadReceipts();
    } catch (err: any) {
      setError(err?.message || 'تصدیق کا عمل مکمل نہیں ہو سکا۔');
    } finally {
      setVerifying(false);
    }
  };

  const filteredReceipts = receipts.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    return true;
  });

  const pendingCount = receipts.filter((r) => r.status === 'PENDING_VERIFICATION').length;
  const approvedCount = receipts.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = receipts.filter((r) => r.status === 'REJECTED').length;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 font-urdu">
              زیرِ تصدیق ادائیگیاں و رسیدیں
            </h1>
            <p className="text-xs lg:text-sm text-slate-500 font-urdu mt-1">
              گاہکوں کی طرف سے موصول شدہ بینک سلپس اور کیش رسیدوں کی انتظامی جانچ
            </p>
          </div>
          <button
            onClick={loadReceipts}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تازہ کریں</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {actionSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-urdu flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-emerald-700 hover:underline font-mono text-[10px]"
            >
              بند کریں
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-urdu flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Status Tab Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-urdu font-medium transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-navy-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            تمام رسیدیں ({receipts.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING_VERIFICATION')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-urdu font-medium transition-colors ${
              statusFilter === 'PENDING_VERIFICATION'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            زیرِ تصدیق ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-urdu font-medium transition-colors ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            منظور شدہ ({approvedCount})
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-urdu font-medium transition-colors ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            مسترد شدہ ({rejectedCount})
          </button>
        </div>

        {/* Receipts Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner text="رسیدوں کا ڈیٹا لوڈ ہو رہا ہے..." />
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="py-12">
              <EmptyState
                title="کوئی رسید موجود نہیں ہے"
                description="منتخب کردہ فلٹر کے مطابق کوئی رسید کی قطار دستیاب نہیں ہے۔"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 font-urdu border-b border-slate-200/80">
                    <th className="py-3 px-4 font-semibold">رسید ID و تاریخ</th>
                    <th className="py-3 px-4 font-semibold">گاہک کا نام</th>
                    <th className="py-3 px-4 font-semibold">دعویٰ شدہ رقم</th>
                    <th className="py-3 px-4 font-semibold">چینل / ریفرنس</th>
                    <th className="py-3 px-4 font-semibold">حالت</th>
                    <th className="py-3 px-4 font-semibold">تصدیق کنندہ و نوٹ</th>
                    <th className="py-3 px-4 font-semibold text-center">انتظامی فیصلہ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReceipts.map((rcpt) => (
                    <tr key={rcpt.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900">{rcpt.id}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {formatKarachiDate(rcpt.payment_date || rcpt.submitted_at)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <Link
                          href={`/customers/${rcpt.customer_id}`}
                          className="font-bold text-slate-900 hover:text-teal-700 font-urdu block"
                        >
                          {rcpt.customer_id}
                        </Link>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-black text-emerald-600 text-sm whitespace-nowrap">
                        {formatPKR(rcpt.claimed_amount)}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        <div>{rcpt.channel || 'بینک ٹرانسفر'}</div>
                        {rcpt.transaction_reference && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">
                            ریف: {rcpt.transaction_reference}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={rcpt.status} />
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-urdu">
                        {rcpt.verified_by ? (
                          <div>
                            <span className="font-semibold">{rcpt.verified_by}</span>
                            {rcpt.verification_notes && (
                              <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">
                                {rcpt.verification_notes}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">انتظارِ تصدیق</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {rcpt.status === 'PENDING_VERIFICATION' ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenVerify(rcpt, 'APPROVED')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-urdu font-semibold transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>منظور کریں</span>
                            </button>
                            <button
                              onClick={() => handleOpenVerify(rcpt, 'REJECTED')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-urdu font-medium transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>مسترد</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-urdu font-semibold">
                            مکمل شدہ
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Verification Action Modal */}
        {selectedReceipt && (
          <ConfirmationModal
            isOpen={verifyModalOpen}
            onClose={() => setVerifyModalOpen(false)}
            onConfirm={handleConfirmVerify}
            loading={verifying}
            title={actionType === 'APPROVED' ? 'رسید کی منظوری کی توثیق' : 'رسید مسترد کرنے کی توثیق'}
            confirmText={actionType === 'APPROVED' ? 'منظور اور کھاتے میں جمع کریں' : 'رسید مسترد کریں'}
            cancelText="منسوخ کریں"
            type={actionType === 'APPROVED' ? 'info' : 'danger'}
          >
            <div className="space-y-4 text-xs font-urdu text-right">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">رسید نمبر:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedReceipt.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">کسٹمر اکاؤنٹ:</span>
                  <span className="font-mono text-slate-800">{selectedReceipt.customer_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">دعویٰ شدہ رقم:</span>
                  <span className="font-mono font-black text-emerald-600 text-sm">
                    {formatPKR(selectedReceipt.claimed_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">چینل:</span>
                  <span className="text-slate-800">{selectedReceipt.channel || 'بینک اکاؤنٹ'}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  انتظامی نوٹ / تصدیقی حوالہ (Verification Note):
                </label>
                <textarea
                  rows={2}
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="بینک ٹرانسفر تصدیقی نمبر یا وجہ درج کریں"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-urdu focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {actionType === 'APPROVED' && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2">
                  <FileCheck className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                  <span>
                    منظوری کے ساتھ ہی کسٹمر کے گوگل شیٹس کھاتے میں رقم جمع (Credit Payment) کے طور پر خودکار درج ہو جائے گی اور بقایا کم ہو جائے گا۔
                  </span>
                </div>
              )}
            </div>
          </ConfirmationModal>
        )}
      </div>
    </AppShell>
  );
}
