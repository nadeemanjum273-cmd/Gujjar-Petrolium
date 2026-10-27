'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Truck,
  Search,
  Fuel,
  Phone,
  MapPin,
  FileText,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  PlusCircle,
  ChevronRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  X,
  Droplet,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useLanguage } from '@/lib/LanguageContext';
import { formatPKR, formatPakistaniPhone } from '@/lib/formatters';
import { DEMO_SUPPLIERS, Supplier } from '@/lib/demoData';

export default function SuppliersPage() {
  const { isUrdu, t } = useLanguage();
  const [suppliers] = useState<Supplier[]>(DEMO_SUPPLIERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [supplyLogSuccess, setSupplyLogSuccess] = useState<string | null>(null);

  // Filtered suppliers
  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nameUr.includes(searchQuery) ||
      s.shortCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.terminal.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === 'ALL' || s.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const totalMonthlyVolume = suppliers.reduce((acc, s) => acc + s.monthlySupplyLiters, 0);
  const totalPayables = suppliers.reduce((acc, s) => acc + s.outstandingBalancePKR, 0);
  const activeContractsCount = suppliers.filter((s) => s.status === 'ACTIVE').length;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                    {t('totalSupplier')}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 text-sky-800 border border-sky-200">
                    10 REGISTERED
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  {t('suppliersSubtitle')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSupplyModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-sm pop-out-btn transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isUrdu ? 'نیا سپلائر / ٹینکر اندراج' : 'Log Fuel Delivery'}</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {supplyLogSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{supplyLogSuccess}</span>
            </div>
            <button
              onClick={() => setSupplyLogSuccess(null)}
              className="text-emerald-700 hover:underline font-mono text-[11px]"
            >
              {isUrdu ? 'بند کریں' : 'Dismiss'}
            </button>
          </div>
        )}

        {/* 1. HERO STATS (4 Cards) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="pop-out-card bg-white rounded-2xl p-4 sm:p-5 border border-sky-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">{t('totalSupplier')}</span>
              <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-2">
              10
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isUrdu ? 'پی ایس او، شیل، اٹک و دیگر' : 'PSO, Shell, Attock & More'}
            </p>
          </div>

          <div className="pop-out-card bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">{t('monthlyVolume')}</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Fuel className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono mt-2">
              {totalMonthlyVolume.toLocaleString()} <span className="text-sm font-bold">L</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isUrdu ? 'ماہانہ فیول ٹینکر آمد' : 'Monthly bulk tanker arrivals'}
            </p>
          </div>

          <div className="pop-out-card bg-white rounded-2xl p-4 sm:p-5 border border-rose-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">{t('outstandingDues')}</span>
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-600 font-mono mt-2">
              {formatPKR(totalPayables, { showUrduSuffix: false, showSymbol: false })}{' '}
              <span className="text-xs font-bold">{isUrdu ? 'روپے' : 'PKR'}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isUrdu ? 'کمپنیوں کے واجب الادا بقایا جات' : 'Pending company payments'}
            </p>
          </div>

          <div className="pop-out-card bg-white rounded-2xl p-4 sm:p-5 border border-indigo-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">{t('activeContracts')}</span>
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 font-mono mt-2">
              {activeContractsCount} / 10
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isUrdu ? 'اوگرا لائسنس یافتہ سپلائی' : 'OGRA verified supply'}
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
              placeholder={isUrdu ? 'سپلائر کمپنی کا نام یا ٹرمینل تلاش کریں...' : 'Search supplier company or terminal...'}
              className={`w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl py-2 ${
                isUrdu ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
              } focus:outline-none focus:border-sky-500`}
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: isUrdu ? 'تمام سپلائرز' : 'All Suppliers' },
              { id: 'PETROL_DIESEL', label: isUrdu ? 'پیٹرول و ڈیزل' : 'Petrol & Diesel' },
              { id: 'LUBRICANTS', label: isUrdu ? 'موبل آئل و چکنائی' : 'Lubricants' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  categoryFilter === tab.id
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. SUPPLIER CARDS GRID (10 Suppliers) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((sup) => (
            <div
              key={sup.id}
              className="pop-out-card bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-sky-300 transition-all group"
            >
              <div>
                {/* Header: Short Code & Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 text-white font-black text-sm flex items-center justify-center shadow-sm">
                      {sup.shortCode}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug group-hover:text-sky-600 transition-colors">
                        {isUrdu ? sup.nameUr : sup.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[180px]">{isUrdu ? sup.terminalUr : sup.terminal}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold font-mono ${
                      sup.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : sup.status === 'ON_ORDER'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {sup.status}
                  </span>
                </div>

                {/* Fuels Supplied Badges */}
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {(isUrdu ? sup.fuelSuppliedUr : sup.fuelSupplied).map((fuel, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/60"
                    >
                      {fuel}
                    </span>
                  ))}
                </div>

                {/* Supply Details Grid */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t('contactPerson')}</span>
                    <span className="font-bold text-slate-800 text-[11px] truncate block">
                      {isUrdu ? sup.contactPersonUr : sup.contactPerson}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {formatPakistaniPhone(sup.phone)}
                    </span>
                  </div>

                  <div className={`text-${isUrdu ? 'left' : 'right'}`}>
                    <span className="text-[10px] text-slate-400 block">{t('monthlyVolume')}</span>
                    <span className="font-extrabold text-slate-900 font-mono text-[13px]">
                      {sup.monthlySupplyLiters.toLocaleString()} L
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {isUrdu ? sup.paymentTermsUr : sup.paymentTerms}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Card Footer: Balance & Action */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">{isUrdu ? 'واجب الادا بقایا:' : 'Outstanding Dues:'}</span>
                  <span
                    className={`font-mono font-extrabold text-xs sm:text-sm ${
                      sup.outstandingBalancePKR > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {formatPKR(sup.outstandingBalancePKR)}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedSupplier(sup)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 text-xs font-bold transition-all pop-out-btn cursor-pointer"
                >
                  <span>{isUrdu ? 'تفصیل لیجر' : 'Details'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 4. DETAIL MODAL (Inspect Supplier Ledger & Deliveries) */}
        {selectedSupplier && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white font-black text-base flex items-center justify-center shadow-md">
                    {selectedSupplier.shortCode}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      {isUrdu ? selectedSupplier.nameUr : selectedSupplier.name}
                    </h2>
                    <p className="text-xs text-slate-500 font-mono">
                      {isUrdu ? selectedSupplier.terminalUr : selectedSupplier.terminal}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSupplier(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Supplier Info Details */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">{t('contactPerson')}</span>
                  <span className="font-bold text-slate-800">
                    {isUrdu ? selectedSupplier.contactPersonUr : selectedSupplier.contactPerson}
                  </span>
                  <a
                    href={`tel:${selectedSupplier.phone}`}
                    className="text-sky-600 font-mono font-bold block hover:underline"
                  >
                    {selectedSupplier.phone}
                  </a>
                </div>
                <div className={`text-${isUrdu ? 'left' : 'right'}`}>
                  <span className="text-slate-400 block text-[10px]">{isUrdu ? 'کنٹریکٹ نمبر' : 'Contract Ref'}</span>
                  <span className="font-mono font-bold text-slate-800">{selectedSupplier.activeContract}</span>
                  <span className="text-[10px] text-emerald-600 font-bold block">{isUrdu ? 'اوگرا تصدیق شدہ' : 'OGRA Verified'}</span>
                </div>
              </div>

              {/* Tanker Fleet Assigned */}
              <div>
                <span className="text-xs font-bold text-slate-600 block mb-1.5">
                  {isUrdu ? 'منسلک آئل ٹینکر گاڑیاں:' : 'Assigned Oil Tanker Fleet:'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedSupplier.tankerRegNumbers.map((tanker, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 font-mono text-xs font-extrabold border border-sky-200"
                    >
                      {tanker}
                    </span>
                  ))}
                </div>
              </div>

              {/* Financial Snapshot */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>{isUrdu ? 'ماہانہ سپلائی کوٹہ:' : 'Monthly Supply Volume:'}</span>
                  <span className="font-mono font-bold text-white">
                    {selectedSupplier.monthlySupplyLiters.toLocaleString()} Liters
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>{isUrdu ? 'شرائط ادائیگی:' : 'Payment Terms:'}</span>
                  <span className="font-bold text-slate-200">
                    {isUrdu ? selectedSupplier.paymentTermsUr : selectedSupplier.paymentTerms}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-sm">
                  <span className="font-bold text-slate-200">{isUrdu ? 'موجودہ واجب الادا بقایا:' : 'Outstanding Balance:'}</span>
                  <span className="font-mono font-black text-rose-400">
                    {formatPKR(selectedSupplier.outstandingBalancePKR)}
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedSupplier(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  {isUrdu ? 'بند کریں' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. NEW DELIVERY / TANKER LOG MODAL */}
        {isSupplyModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 text-base">
                  {isUrdu ? 'نئے ٹینکر کی آمد درج کریں' : 'Log Bulk Tanker Delivery'}
                </h3>
                <button
                  onClick={() => setIsSupplyModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsSupplyModalOpen(false);
                  setSupplyLogSuccess(
                    isUrdu
                      ? 'ٹینکر کی آمد اور اسٹاک ڈپوزٹ کامیابی سے درج ہو گیا۔'
                      : 'Tanker delivery and stock dip logged successfully!'
                  );
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isUrdu ? 'سپلائر منتخب کریں' : 'Select Supplier'}
                  </label>
                  <select className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium">
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.shortCode} - {isUrdu ? s.nameUr : s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isUrdu ? 'ٹینکر رجسٹریشن نمبر' : 'Tanker Reg. Number'}
                  </label>
                  <input
                    type="text"
                    defaultValue="TL-4890"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      {isUrdu ? 'مقدار (لیٹرز)' : 'Volume (Liters)'}
                    </label>
                    <input
                      type="number"
                      defaultValue="24000"
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      {isUrdu ? 'ٹینک نمبر' : 'Underground Tank'}
                    </label>
                    <select className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium">
                      <option>Tank #1 (Super Petrol)</option>
                      <option>Tank #2 (High Speed Diesel)</option>
                      <option>Tank #3 (Reserve Diesel)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSupplyModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                  >
                    {isUrdu ? 'منسوخ' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-sm"
                  >
                    {isUrdu ? 'محفوظ کریں' : 'Confirm Entry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
