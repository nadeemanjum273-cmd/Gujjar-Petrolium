'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink, Receipt, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { formatPKR } from '@/lib/formatters';

interface BillingRecord {
  sr: number;
  buildDate: string;
  invoiceNo: string;
  customerNo: string;
  customerName: string;
  email: string;
  address: string;
  total: number;
  status: 'PAID' | 'CREDIT' | 'PARTIAL';
}

export function TodayBillingTable() {
  const { isUrdu, t } = useLanguage();

  const billingRecords: BillingRecord[] = [
    {
      sr: 1,
      buildDate: '2024-02-18',
      invoiceNo: 'INV-0003',
      customerNo: '0300-7979797',
      customerName: 'Chaudhry Naman Gujjar',
      email: 'naman.gujjar@gmail.com',
      address: 'Kot Gujjran, Gujrat Road',
      total: 4120,
      status: 'PAID',
    },
    {
      sr: 2,
      buildDate: '2024-02-15',
      invoiceNo: 'INV-0002',
      customerNo: '0345-8765432',
      customerName: 'Malik Tariq Transport',
      email: 'tariq.transport@example.com',
      address: 'Truck Stand, GT Road, Gujrat',
      total: 33060,
      status: 'CREDIT',
    },
    {
      sr: 3,
      buildDate: '2024-02-18',
      invoiceNo: 'INV-0004',
      customerNo: '0321-4567890',
      customerName: 'Haji Aslam Agricultural Farm',
      email: 'aslamfarms@gmail.com',
      address: 'Kotla Arab Ali Khan',
      total: 18500,
      status: 'PARTIAL',
    },
    {
      sr: 4,
      buildDate: '2024-02-18',
      invoiceNo: 'INV-0005',
      customerNo: '0302-1122334',
      customerName: 'Al-Madina Goods Forwarding',
      email: 'almadina.logistics@yahoo.com',
      address: 'Near Bypass, Kot Gujjran',
      total: 26400,
      status: 'CREDIT',
    },
  ];

  const getStatusBadge = (status: BillingRecord['status']) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>{isUrdu ? 'ادا شدہ' : 'Paid'}</span>
          </span>
        );
      case 'CREDIT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <span>{isUrdu ? 'ادھار (کھاتہ)' : 'Credit'}</span>
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span>{isUrdu ? 'جزوی ادا' : 'Partial'}</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm pop-out-card flex flex-col overflow-hidden">
      {/* Table Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {t('todaysBillingTable')}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isUrdu ? 'آج کے تمام جاری کردہ کمپیوٹرائزڈ بل اور کیش میمو' : 'All Computerized Billing Invoices Issued Today'}
          </p>
        </div>
        <Link
          href="/receipts"
          className="text-xs font-semibold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1 pop-out-btn px-2.5 py-1 rounded-lg bg-teal-50"
        >
          <span>{t('viewAll')}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto flex-1">
        <table className={`w-full text-xs ${isUrdu ? 'text-right' : 'text-left'}`}>
          <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/60 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">{t('colSr')}</th>
              <th className="py-3 px-4">{t('colBuildDate')}</th>
              <th className="py-3 px-4">{t('colInvoiceNo')}</th>
              <th className="py-3 px-4">{t('colCustomerNo')}</th>
              <th className="py-3 px-4">{t('colCustomerName')}</th>
              <th className="py-3 px-4">{t('colEmail')}</th>
              <th className="py-3 px-4">{t('colAddress')}</th>
              <th className="py-3 px-4">{t('colTotal')}</th>
              <th className="py-3 px-4">{t('colStatus')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {billingRecords.map((rec) => (
              <tr
                key={rec.invoiceNo}
                className="pop-out-row hover:bg-slate-50/80 transition-all cursor-pointer"
              >
                <td className="py-3.5 px-4 font-mono font-bold text-slate-500">{rec.sr}</td>
                <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                  {rec.buildDate}
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span className="font-mono font-bold text-teal-700 bg-teal-50/80 px-2 py-0.5 rounded-md border border-teal-200/50">
                    {rec.invoiceNo}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap ltr-text">
                  {rec.customerNo}
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-900">
                  {rec.customerName}
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                  {rec.email}
                </td>
                <td className="py-3.5 px-4 text-slate-600 truncate max-w-[200px]">
                  {rec.address}
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap font-mono font-extrabold text-slate-900">
                  {formatPKR(rec.total)}
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
      <div className="p-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 px-5">
        <span>{isUrdu ? 'کل 4 بلنگ ریکارڈز دکھائے گئے ہیں' : 'Showing 4 todays billing records'}</span>
        <span className="font-mono font-bold text-slate-800">
          {isUrdu ? 'مجموعی بلنگ:' : 'Total Billing:'} {formatPKR(82080)}
        </span>
      </div>
    </div>
  );
}
