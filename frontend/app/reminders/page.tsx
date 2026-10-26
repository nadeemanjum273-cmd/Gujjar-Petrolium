'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  AlertTriangle,
  Send,
  Eye,
  CheckCircle2,
  Clock,
  ShieldAlert,
  UserCheck,
  UserX,
  Phone,
  Filter,
  RefreshCw,
  Info,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { api } from '@/lib/api';
import { formatPKR, formatKarachiDate, formatKarachiDateTime } from '@/lib/formatters';
import { OverdueReportResponse, OverdueReportItem, ReminderLog, ReminderPreviewResponse } from '@/types';
import { BUSINESS_IDENTITY } from '@/lib/constants';

export default function RemindersPage() {
  const [overdueReport, setOverdueReport] = useState<OverdueReportResponse | null>(null);
  const [pastReminders, setPastReminders] = useState<ReminderLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Preview & Queue Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<OverdueReportItem | null>(null);
  const [previewData, setPreviewData] = useState<ReminderPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [submittingReminder, setSubmittingReminder] = useState(false);
  const [overrideCooldown, setOverrideCooldown] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Excluded Customer IDs (in-memory for session)
  const [excludedIds, setExcludedIds] = useState<string[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [overdue, reminders] = await Promise.all([
        api.getOverdueReport(15).catch(() => null),
        api.getReminders().catch(() => []),
      ]);
      if (overdue) setOverdueReport(overdue);
      setPastReminders(reminders);
    } catch (err: any) {
      setError(err?.message || 'ریمائنڈر ڈیٹا لوڈ کرنے میں دشواری پیش آئی ہے۔');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const eligibleCustomers = (overdueReport?.customers || []).filter(
    (c) => !excludedIds.includes(c.customer_id)
  );

  const handleOpenPreview = async (customer: OverdueReportItem) => {
    setSelectedCustomer(customer);
    setOverrideCooldown(false);
    setPreviewLoading(true);
    setPreviewOpen(true);

    try {
      const data = await api.previewReminder(customer.customer_id, false);
      setPreviewData(data);
    } catch (err: any) {
      setError(err?.message || 'پیش نظارہ تیار کرنے میں ناکامی ہوئی۔');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleToggleOverride = async () => {
    if (!selectedCustomer) return;
    const newOverride = !overrideCooldown;
    setOverrideCooldown(newOverride);
    try {
      setPreviewLoading(true);
      const data = await api.previewReminder(selectedCustomer.customer_id, newOverride);
      setPreviewData(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExclude = (customerId: string) => {
    setExcludedIds((prev) => [...prev, customerId]);
  };

  const handleSendReminder = async () => {
    if (!selectedCustomer || !previewData) return;
    try {
      setSubmittingReminder(true);
      setError(null);

      const res = await api.sendReminder(
        selectedCustomer.customer_id,
        'GENTLE',
        overrideCooldown,
        'Manager authorized reminder dispatch'
      );

      const modeStr = res.dry_run ? 'ٹیسٹ موڈ (DRY_RUN)' : 'براہ راست (LIVE)';
      setActionFeedback(
        `گاہک (${previewData.customer_name}) کو واٹس ایپ ریمائنڈر کامیابی سے بھیج دیا گیا! [${modeStr}] • WAMID: ${res.whatsapp_message_id || 'simulated'}`
      );
      setPreviewOpen(false);
      loadData();
    } catch (err: any) {
      setError(err?.message || 'ریمائنڈر بھیجنے میں ناکامی ہوئی۔');
    } finally {
      setSubmittingReminder(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 font-urdu">
              واٹس ایپ کھاتہ ریمائنڈرز
            </h1>
            <p className="text-xs lg:text-sm text-slate-500 font-urdu mt-1">
              واجب الادا گاہکوں کے ریمائنڈرز کا جائزہ اور تصدیق
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تازہ کریں</span>
          </button>
        </div>

        {/* Phase Notice */}
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-start gap-3 text-xs font-urdu text-teal-900">
          <Info className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">فیز 3 پیش نظارہ اور ٹیسٹنگ موڈ (UI Preview Mode):</span>
            <p className="text-teal-800 text-[11px] leading-relaxed">
              اس فیز میں پیغامات کا پیش نظارہ، رضامندی کی جانچ اور لاگ ریکارڈنگ مکمل طور پر فعال ہے۔ اصل لائیو واٹس ایپ میسج ڈیلیوری کلاؤڈ API کے باضابطہ انضمام کے بعد فیز 4 میں لاگو ہوگی۔
            </p>
          </div>
        </div>

        {actionFeedback && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-urdu flex items-center justify-between">
            <span>{actionFeedback}</span>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-emerald-700 hover:underline font-mono text-[10px]"
            >
              بند کریں
            </button>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="کل واجب الادا رقم"
            value={formatPKR(overdueReport?.total_overdue_amount || 0)}
            subtitle="15 دن سے زائد پرانے واجبات"
            icon={AlertTriangle}
            variant="warning"
          />
          <StatCard
            title="اہل اوورڈیو کسٹمرز"
            value={eligibleCustomers.length}
            subtitle="جن کے ذمے رقم واجب الادا ہے"
            icon={MessageSquare}
            variant="primary"
          />
          <StatCard
            title="ریکارڈ شدہ ریمائنڈرز"
            value={pastReminders.length}
            subtitle="تاریخی لاگ اندراجات"
            icon={Clock}
            variant="neutral"
          />
        </div>

        {/* Section 1: Eligible Customers for Reminders */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 font-urdu">
              مجوزہ وصولی ریمائنڈرز ({eligibleCustomers.length})
            </h2>
            <span className="text-xs text-slate-400 font-urdu">
              15 دن سے زائد مدت
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner text="اوورڈیو کھاتے لوڈ ہو رہے ہیں..." />
            </div>
          ) : eligibleCustomers.length === 0 ? (
            <div className="py-12">
              <EmptyState
                title="کوئی اوورڈیو اکاؤنٹ نہیں ہے"
                description="ماشاءاللہ تمام گاہکوں کے واجبات بروقت ادا ہو چکے ہیں یا کوئی اکاؤنٹ 15 دن سے زائد پرانا نہیں ہے۔"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 font-urdu border-b border-slate-200/80">
                    <th className="py-3 px-4 font-semibold">گاہک کا نام</th>
                    <th className="py-3 px-4 font-semibold">موبائل نمبر</th>
                    <th className="py-3 px-4 font-semibold">واجب الادا بقایا</th>
                    <th className="py-3 px-4 font-semibold">تاخیر کی مدت</th>
                    <th className="py-3 px-4 font-semibold">واٹس ایپ رضامندی</th>
                    <th className="py-3 px-4 font-semibold text-center">کارروائی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {eligibleCustomers.map((cust) => (
                    <tr key={cust.customer_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/customers/${cust.customer_id}`}
                          className="font-bold text-slate-900 hover:text-teal-700 font-urdu block"
                        >
                          {cust.customer_name_ur || cust.customer_name}
                        </Link>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ID: {cust.customer_id}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {cust.phone}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-rose-600">
                        {formatPKR(cust.outstanding_balance)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-rose-100 text-rose-800">
                          {cust.days_overdue} دن
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {cust.whatsapp_consent ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-urdu text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <UserCheck className="w-3 h-3" />
                            <span>رضامند (حاصل شدہ)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-urdu text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <UserX className="w-3 h-3" />
                            <span>بغیر رضامندی</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenPreview(cust)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-navy-900 hover:bg-navy-850 text-white rounded-lg text-xs font-urdu font-medium transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>پیش نظارہ اور منظوری</span>
                          </button>
                          <button
                            onClick={() => handleExclude(cust.customer_id)}
                            className="text-slate-400 hover:text-slate-600 px-2 py-1 text-xs font-urdu"
                            title="اس سیشن میں خارج کریں"
                          >
                            خارج کریں
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 2: Reminder Log / History */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 font-urdu">
              گزشتہ ریمائنڈرز کا لاگ ({pastReminders.length})
            </h2>
            <span className="text-xs text-slate-400 font-urdu">گوگل شیٹس ہسٹری</span>
          </div>

          {pastReminders.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-urdu">
              ابھی تک کوئی ریمائنڈر لاگ میں موجود نہیں ہے۔
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 font-urdu border-b border-slate-200/80">
                    <th className="py-2.5 px-4">تاریخ و وقت</th>
                    <th className="py-2.5 px-4">کسٹمر ID</th>
                    <th className="py-2.5 px-4">فون نمبر</th>
                    <th className="py-2.5 px-4">رقم</th>
                    <th className="py-2.5 px-4">حالت</th>
                    <th className="py-2.5 px-4">نوعیت</th>
                    <th className="py-2.5 px-4">پیغام کا متن</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pastReminders.map((rem) => (
                    <tr key={rem.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {formatKarachiDateTime(rem.queued_at)}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-800">
                        {rem.customer_id}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">
                        {rem.phone}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        {formatPKR(rem.amount_due)}
                      </td>
                      <td className="py-2.5 px-4">
                        <StatusBadge status={rem.status} />
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-mono">
                          {rem.dry_run ? 'DRY_RUN (ٹیسٹ)' : 'LIVE'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 font-urdu max-w-xs truncate">
                        {rem.message_text_ur || rem.message_text}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Message Preview Modal */}
        {selectedCustomer && (
          <ConfirmationModal
            isOpen={previewOpen}
            onClose={() => setPreviewOpen(false)}
            onConfirm={handleSendReminder}
            loading={submittingReminder}
            title="واٹس ایپ وصولی ریمائنڈر — حتمی منظوری"
            confirmText={previewData?.can_send ? "منظوری اور واٹس ایپ ارسال کریں" : "ارسال ممکن نہیں"}
            cancelText="منسوخ کریں"
            type={previewData?.can_send ? "info" : "danger"}
          >
            {previewLoading ? (
              <div className="py-8 flex justify-center">
                <LoadingSpinner text="پیش نظارہ تیار ہو رہا ہے..." />
              </div>
            ) : previewData ? (
              <div className="space-y-4 text-xs font-urdu text-right">
                {/* Customer Snapshot */}
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      {previewData.customer_name_ur || previewData.customer_name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {previewData.phone}
                    </div>
                  </div>
                  <div className="text-left font-mono">
                    <div className="text-xs text-rose-600 font-bold">
                      {formatPKR(previewData.current_balance)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {previewData.days_overdue} دن تاخیر
                    </div>
                  </div>
                </div>

                {/* WhatsApp Template Card */}
                <div>
                  <div className="flex justify-between items-center mb-1 text-[11px] text-slate-500">
                    <span className="font-bold text-slate-700">منظور شدہ واٹس ایپ میسج (اردو):</span>
                    <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                      ٹیمپلیٹ: {previewData.template_name} ({previewData.template_lang})
                    </span>
                  </div>
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 text-slate-800 leading-relaxed font-urdu whitespace-pre-line shadow-xs">
                    {previewData.rendered_message_ur}
                  </div>
                </div>

                {/* Duplicate / Cooldown Warning */}
                {previewData.duplicate_warning && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-bold">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>کول ڈاؤن انتباہ (Duplicate-send warning)</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      اس گاہک کو پچھلے {previewData.cooldown_days} دنوں کے دوران پہلے ہی ریمائنڈر بھیجا جا چکا ہے۔
                    </p>
                    <label className="flex items-center gap-2 text-[11px] text-amber-900 font-bold cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={overrideCooldown}
                        onChange={handleToggleOverride}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>منیجر اجازت: کول ڈاؤن نظر انداز کر کے دوبارہ بھیجیں (Override)</span>
                    </label>
                  </div>
                )}

                {/* Consent Warning */}
                {!previewData.whatsapp_consent && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600" />
                    <span>
                      انتباہ: گاہک نے واٹس ایپ رضامندی نہیں دی۔ ضابطہ اخلاق کے تحت ریمائنڈر ارسال نہیں کیا جا سکتا۔
                    </span>
                  </div>
                )}

                {/* Rejection Reasons */}
                {!previewData.can_send && previewData.rejection_reasons.length > 0 && (
                  <div className="p-2.5 bg-rose-50/80 rounded-xl border border-rose-200 text-rose-700 text-[11px]">
                    <span className="font-bold block mb-1">ارسال میں رکاوٹ:</span>
                    <ul className="list-disc list-inside space-y-0.5">
                      {previewData.rejection_reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-2 flex items-center justify-between">
                  <span>مجاز تصدیق کنندہ: {BUSINESS_IDENTITY.manager}</span>
                  <span className="font-mono">PKR / Asia-Karachi</span>
                </div>
              </div>
            ) : null}
          </ConfirmationModal>
        )}
      </div>
    </AppShell>
  );
}
