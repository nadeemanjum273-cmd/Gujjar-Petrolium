'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink, Receipt, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { formatPKR, formatKarachiDateTime } from '@/lib/formatters';
import { Transaction } from '@/types';

interface TodayBillingTableProps {
  transactions?: Transaction[];
}

export function TodayBillingTable({ transactions = [] }: TodayBillingTableProps) {
  const { isUrdu, t } = useLanguage();

  const displayRecords = transactions.length > 0 ? transactions.slice(0, 6) : [
    {
      id: 'TXN-1001',
      transaction_date: new Date().toISOString(),
      slip_number: 'SLIP-841',
      customer_id: 'CUST-001',
      description: 'ہائی اسپیڈ ڈیزل (ٹریکٹر)',
      liters: 60,
      rate_per_liter: 285,
      vehicle_number: 'GJ-4821',
      amount: 17100,
      status: 'APPROVED' as const,
      type: 'CREDIT_SALE' as const,
    },
    {
      id: 'TXN-1002',
      transaction_date: new Date().toISOString(),
      slip_number: 'SLIP-842',
      customer_id: 'CUST-002',
      description: 'سپر پیٹرول (کار)',
      liters: 30,
      rate_per_liter: 280,
      vehicle_number: 'LED-5519',
      amount: 8400,
      status: 'APPROVED' as const,
      type: 'CREDIT_SALE' as const,
    },
    {
      id: 'TXN-1003',
      transaction_date: new Date().toISOString(),
      slip_number: 'RCPT-109',
      customer_id: 'CUST-003',
      description: 'کیش ریکوری / وصولی',
      amount: 25000,
      status: 'APPROVED' as const,
      type: 'PAYMENT' as const,
    },
    {
      id: 'TXN-1004',
      transaction_date: new Date().toISOString(),
      slip_number: 'SLIP-843',
      customer_id: 'CUST-004',
      description: 'موبل آئل (4 لیٹر کین)',
      liters: 4,
      rate_per_liter: 950,
      vehicle_number: 'GTR-102',
      amount: 3800,
      status: 'PENDING' as const,
      type: 'CREDIT_SALE' as const,
    },
  ];

  const getStatusBadge = (status: string) => {
    if (status === 'APPROVED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          <span>{isUrdu ? 'منظور شدہ' : 'Approved'}</span>
        </span>
      );
    }
    if (status === 'PENDING') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <AlertCircle className="w-3 h-3" />
          <span>{isUrdu ? 'زیر التواء' : 'Pending'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-slate-100 text-slate-700">
        <span>{status}</span>
      </span>
    );
  };

  const totalBillingAmount = displayRecords.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm pop-out-card flex flex-col overflow-hidden">
      {/* Table Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {t('todaysBillingTable')}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isUrdu ? 'آج کے بل اور کھاتہ اندراجات' : 'Today’s Invoices & Ledger Entries'}
          </p>
        </div>
        <Link
          href="/receipts"
          className="text-xs font-semibold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1 pop-out-btn px-2.5 py-1.5 rounded-lg bg-teal-50"
        >
          <span>{t('viewAll')}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 1. Mobile Optimized Card List (Visible on mobile screens) */}
      <div className="md:hidden divide-y divide-slate-100 p-3 space-y-2.5">
        {displayRecords.map((rec: any, idx: number) => (
          <div
            key={rec.id || idx}
            className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 active:bg-slate-100 space-y-2 transition-all shadow-xs"
          >
            {/* Top row: Slip No, Date, Status */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60 text-xs">
                {rec.slip_number || rec.id}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {formatKarachiDateTime(rec.transaction_date, 'dateOnly')}
              </span>
              {getStatusBadge(rec.status)}
            </div>

            {/* Middle row: Customer, Vehicle, Details */}
            <div className="flex items-start justify-between gap-2 pt-1">
              <div>
                <Link
                  href={`/customers/${rec.customer_id}`}
                  className="font-bold text-xs text-slate-900 hover:text-teal-700 block"
                >
                  {rec.customer_id}
                </Link>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {rec.description}
                  {rec.liters && ` (${rec.liters} L)`}
                </div>
              </div>
              {rec.vehicle_number && (
                <span className="font-mono text-[11px] bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded ltr-text">
                  {rec.vehicle_number}
                </span>
              )}
            </div>

            {/* Bottom row: Total Amount */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
              <span className="text-[11px] text-slate-500 font-medium">
                {isUrdu ? 'کل رقم:' : 'Total Amount:'}
              </span>
              <span
                className={`font-mono font-black text-sm ${
                  rec.type === 'CREDIT_SALE' ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {rec.type === 'CREDIT_SALE' ? '+' : '-'} {formatPKR(rec.amount)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Desktop Full Table View (Visible on tablet & desktop) */}
      <div className="hidden md:block overflow-x-auto flex-1">
        <table className={`w-full text-xs ${isUrdu ? 'text-right' : 'text-left'}`}>
          <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/60 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">{t('colSr')}</th>
              <th className="py-3 px-4">{t('colBuildDate')}</th>
              <th className="py-3 px-4">{t('colInvoiceNo')}</th>
              <th className="py-3 px-4">{t('colCustomerNo')}</th>
              <th className="py-3 px-4">{isUrdu ? 'تفصیل / فیول' : 'Details / Fuel'}</th>
              <th className="py-3 px-4">{isUrdu ? 'گاڑی نمبر' : 'Vehicle'}</th>
              <th className="py-3 px-4">{t('colTotal')}</th>
              <th className="py-3 px-4">{t('colStatus')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayRecords.map((rec: any, idx: number) => (
              <tr
                key={rec.id || idx}
                className="pop-out-row hover:bg-slate-50/80 transition-all cursor-pointer"
              >
                <td className="py-3.5 px-4 font-mono font-bold text-slate-500">{idx + 1}</td>
                <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                  {formatKarachiDateTime(rec.transaction_date, 'dateOnly')}
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span className="font-mono font-bold text-teal-700 bg-teal-50/80 px-2 py-0.5 rounded-md border border-teal-200/50">
                    {rec.slip_number || rec.id}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                  <Link href={`/customers/${rec.customer_id}`} className="hover:text-teal-600 hover:underline">
                    {rec.customer_id}
                  </Link>
                </td>
                <td className="py-3.5 px-4 text-slate-800 font-medium truncate max-w-[200px]">
                  {rec.description}
                  {rec.liters && (
                    <span className="text-[11px] text-slate-500 block font-mono">
                      {rec.liters} L @ PKR {rec.rate_per_liter}
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap ltr-text">
                  {rec.vehicle_number || '—'}
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap font-mono font-extrabold text-slate-900">
                  <span className={rec.type === 'CREDIT_SALE' ? 'text-rose-600' : 'text-emerald-600'}>
                    {rec.type === 'CREDIT_SALE' ? '+' : '-'} {formatPKR(rec.amount)}
                  </span>
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap">
                  {getStatusBadge(rec.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="p-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 px-4 sm:px-5">
        <span>
          {isUrdu
            ? `کل ${displayRecords.length} بلنگ ریکارڈز`
            : `Showing ${displayRecords.length} records`}
        </span>
        <span className="font-mono font-bold text-slate-800">
          {isUrdu ? 'مجموعی بلنگ:' : 'Total Volume:'} {formatPKR(totalBillingAmount)}
        </span>
      </div>
    </div>
  );
}
