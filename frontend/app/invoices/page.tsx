'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  Printer,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Calendar,
  Fuel,
  CreditCard,
  User,
  Truck,
  X,
  ExternalLink,
  ChevronRight,
  Receipt,
  Download,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useLanguage } from '@/lib/LanguageContext';
import { formatPKR, formatKarachiDateTime } from '@/lib/formatters';
import { DEMO_INVOICES, InvoiceRecord } from '@/lib/demoData';

export default function InvoicesPage() {
  const { isUrdu, t } = useLanguage();
  const [invoices] = useState<InvoiceRecord[]>(DEMO_INVOICES);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.slipNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerNameUr.includes(searchQuery) ||
      inv.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPayment =
      paymentFilter === 'ALL' || inv.paymentMode === paymentFilter;

    return matchesSearch && matchesPayment;
  });

  const totalInvoicedAmount = invoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const totalLiters = invoices.reduce((acc, i) => acc + i.liters, 0);
  const creditInvoicesCount = invoices.filter((i) => i.paymentMode === 'CREDIT_KHATA').length;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                    {t('totalInvoices')}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                    LIVE BILLING
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  {t('invoicesSubtitle')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/transactions/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white rounded-xl text-xs font-bold shadow-sm pop-out-btn transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('navNewTransaction')}</span>
            </Link>
          </div>
        </div>

        {/* 1. HERO STATS (4 Cards) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="pop-out-card bg-white rounded-2xl p-4 sm:p-5 border border-rose-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">{t('totalInvoices')}</span>
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-2">
              {invoices.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isUrdu ? 'آج کے کمپیوٹرائزڈ بل' : 'Generated today'}
            </p>
          </div>

          <div className="pop-out-card bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">{isUrdu ? 'کل بلنگ رقم' : 'Invoiced Value'}</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 font-mono mt-2">
              {formatPKR(totalInvoicedAmount, { showUrduSuffix: false, showSymbol: false })}{' '}
              <span className="text-xs font-bold">{isUrdu ? 'روپے' : 'PKR'}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isUrdu ? 'نقد و کھاتہ فروخت' : 'Cash & ledger credit sum'}
            </p>
          </div>

          <div className="pop-out-card bg-white rounded-2xl p-4 sm:p-5 border border-sky-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">{isUrdu ? 'فروخت شدہ فیول' : 'Fuel Dispensed'}</span>
              <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                <Fuel className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-sky-600 font-mono mt-2">
              {totalLiters.toLocaleString()} <span className="text-sm font-bold">L</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isUrdu ? 'نوزلز سے کل نکاسی' : 'Total liters through nozzles'}
            </p>
          </div>

          <div className="pop-out-card bg-white rounded-2xl p-4 sm:p-5 border border-amber-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">{isUrdu ? 'ادھار بلز' : 'Credit Khata Bills'}</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 font-mono mt-2">
              {creditInvoicesCount} <span className="text-xs font-bold text-slate-400">/ {invoices.length}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isUrdu ? 'کھاتے دار کسٹمرز کے بلز' : 'Logged into customer ledgers'}
            </p>
          </div>
        </div>

        {/* 2. SEARCH & FILTER CONTROLS */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="relative flex-1">
            <Search className={`w-4 h-4 text-slate-400 absolute ${isUrdu ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isUrdu ? 'انوائس نمبر، گاہک، یا گاڑی نمبر تلاش کریں...' : 'Search invoice #, customer name, vehicle...'}
              className={`w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl py-2 ${
                isUrdu ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
              } focus:outline-none focus:border-rose-500`}
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: isUrdu ? 'تمام بلز' : 'All Bills' },
              { id: 'CREDIT_KHATA', label: isUrdu ? 'ادھار کھاتہ' : 'Credit Khata' },
              { id: 'CASH', label: isUrdu ? 'نقد فروخت' : 'Cash' },
              { id: 'ONLINE_TRANSFER', label: isUrdu ? 'آن لائن ٹرانسفر' : 'Online' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPaymentFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  paymentFilter === tab.id
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. INVOICES TABLE (Desktop) & CARDS (Mobile) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100 p-3 space-y-2.5">
            {filteredInvoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => setSelectedInvoice(inv)}
                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 active:bg-slate-100 space-y-2 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60 text-xs">
                    {inv.slipNumber}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {formatKarachiDateTime(inv.date, 'dateOnly')}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {inv.status}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2 pt-1">
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">
                      {isUrdu ? inv.customerNameUr : inv.customerName}
                    </span>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {isUrdu ? inv.fuelTypeUr : inv.fuelType} ({inv.liters} L @ {inv.ratePerLiter})
                    </div>
                  </div>
                  <span className="font-mono text-[11px] bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded ltr-text">
                    {inv.vehicleNumber}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {isUrdu ? inv.paymentModeUr : inv.paymentMode}:
                  </span>
                  <span className="font-mono font-black text-sm text-rose-600">
                    {formatPKR(inv.totalAmount)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Full Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className={`w-full text-xs ${isUrdu ? 'text-right' : 'text-left'}`}>
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/60 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">{t('colInvoiceNo')}</th>
                  <th className="py-3 px-4">{t('colBuildDate')}</th>
                  <th className="py-3 px-4">{t('colCustomerName')}</th>
                  <th className="py-3 px-4">{isUrdu ? 'گاڑی نمبر' : 'Vehicle'}</th>
                  <th className="py-3 px-4">{isUrdu ? 'فیول پروڈکٹ' : 'Fuel Item'}</th>
                  <th className="py-3 px-4">{isUrdu ? 'طریقہ ادائیگی' : 'Payment Mode'}</th>
                  <th className="py-3 px-4">{t('colTotal')}</th>
                  <th className="py-3 px-4">{isUrdu ? 'ایکشن' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="pop-out-row hover:bg-slate-50/80 transition-all cursor-pointer"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60">
                        {inv.slipNumber}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {formatKarachiDateTime(inv.date, 'dateOnly')}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-900 block">
                        {isUrdu ? inv.customerNameUr : inv.customerName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{inv.customerId}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700 whitespace-nowrap ltr-text">
                      {inv.vehicleNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800">
                      <span className="font-medium block">{isUrdu ? inv.fuelTypeUr : inv.fuelType}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {inv.liters} L @ PKR {inv.ratePerLiter}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          inv.paymentMode === 'CREDIT_KHATA'
                            ? 'bg-amber-100 text-amber-800'
                            : inv.paymentMode === 'CASH'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {isUrdu ? inv.paymentModeUr : inv.paymentMode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono font-black text-rose-600 text-sm">
                      {formatPKR(inv.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs transition-colors pop-out-btn"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{isUrdu ? 'رسید' : 'Slip'}</span>
                      </button>
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
                ? `کل ${filteredInvoices.length} کمپیوٹرائزڈ انوائسز`
                : `Showing ${filteredInvoices.length} invoices`}
            </span>
            <span className="font-mono font-bold text-slate-800">
              {isUrdu ? 'مجموعی بلنگ:' : 'Total Volume:'} {formatPKR(totalInvoicedAmount)}
            </span>
          </div>
        </div>

        {/* 4. THERMAL INVOICE SLIP MODAL (Print Preview) */}
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-500">{t('thermalReceipt')}</span>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Thermal Print Slip Container */}
              <div
                id="thermal-slip-print"
                className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-300 font-mono text-xs space-y-3"
              >
                {/* Station Header */}
                <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-2.5">
                  <h3 className="font-black text-sm text-slate-900 tracking-tight">
                    GUJJAR PETROLIUM
                  </h3>
                  <p className="text-[11px] text-slate-600">گجر پیٹرولیم، کوٹ گجراں</p>
                  <p className="text-[10px] text-slate-500">Kot Gujjran, Punjab | Ph: +92 300 8421099</p>
                  <p className="text-[9px] text-slate-400">NTN: 881920-1 | STRN: 32009812401</p>
                </div>

                {/* Slip Metadata */}
                <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Slip No:</span>
                    <span className="font-bold text-slate-900">{selectedInvoice.slipNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date/Time:</span>
                    <span className="text-slate-800">{formatKarachiDateTime(selectedInvoice.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span className="font-bold text-slate-900 truncate max-w-[170px]">
                      {selectedInvoice.customerName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vehicle No:</span>
                    <span className="font-bold text-slate-900">{selectedInvoice.vehicleNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nozzle / Dispenser:</span>
                    <span className="text-slate-700">{selectedInvoice.nozzleNumber}</span>
                  </div>
                </div>

                {/* Fuel Volume & Calculation */}
                <div className="space-y-1.5 text-xs border-b border-dashed border-slate-300 pb-2">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{selectedInvoice.fuelType}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>Volume:</span>
                    <span>{selectedInvoice.liters} Liters</span>
                  </div>
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>Rate / Liter:</span>
                    <span>PKR {selectedInvoice.ratePerLiter}</span>
                  </div>
                </div>

                {/* Total & Payment Mode */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between items-baseline font-black text-sm text-slate-900">
                    <span>TOTAL:</span>
                    <span className="text-rose-600 text-base">{formatPKR(selectedInvoice.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Mode:</span>
                    <span className="font-bold text-slate-800">{selectedInvoice.paymentModeUr}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Cashier:</span>
                    <span>{selectedInvoice.cashierName}</span>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="text-center pt-2 text-[10px] text-slate-500 border-t border-dashed border-slate-300">
                  <p>شکریہ برائے تشریف آوری</p>
                  <p>Computerized Verification Receipt</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  {isUrdu ? 'بند کریں' : 'Close'}
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isUrdu ? 'پرنٹ کریں' : 'Print Slip'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
