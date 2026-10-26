'use client';

import React, { useEffect, useState, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  PlusCircle,
  ArrowRight,
  User,
  Fuel,
  Receipt,
  Truck,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  FileText,
  Calculator,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import { formatPKR } from '@/lib/formatters';
import { Customer, TransactionType, AdjustmentDirection } from '@/types';
import { FUEL_PRODUCTS } from '@/lib/constants';

function NewTransactionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get('customer_id') || '';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Form State
  const [customerId, setCustomerId] = useState(preselectedCustomerId);
  const [txnType, setTxnType] = useState<TransactionType>('CREDIT_SALE');
  const [txnDate, setTxnDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [fuelType, setFuelType] = useState('High Octane Super');
  const [vehicleNo, setVehicleNo] = useState('');
  const [slipNo, setSlipNo] = useState('');
  const [liters, setLiters] = useState('');
  const [unitRate, setUnitRate] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [adjustmentDirection, setAdjustmentDirection] = useState<AdjustmentDirection>('DEBIT');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successTxnId, setSuccessTxnId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Selected customer details
  const selectedCustomer = customers.find((c) => c.id === customerId);

  useEffect(() => {
    async function loadCustomers() {
      try {
        setLoadingCustomers(true);
        const data = await api.getCustomers(undefined, 'ACTIVE');
        setCustomers(data);
        if (preselectedCustomerId) {
          setCustomerId(preselectedCustomerId);
        }
      } catch (err: any) {
        console.error('Failed to load customers', err);
      } finally {
        setLoadingCustomers(false);
      }
    }
    loadCustomers();
  }, [preselectedCustomerId]);

  // When customer changes, if customer has vehicles, pre-fill the first vehicle
  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    const cust = customers.find((c) => c.id === id);
    if (cust?.vehicle_numbers && cust.vehicle_numbers.length > 0) {
      setVehicleNo(cust.vehicle_numbers[0]);
    } else {
      setVehicleNo('');
    }
  };

  // Auto calculate amount when liters or unit rate changes (for CREDIT_SALE)
  const handleLitersChange = (val: string) => {
    setLiters(val);
    if (val && unitRate) {
      const calc = (parseFloat(val) * parseFloat(unitRate)).toFixed(2);
      if (!isNaN(Number(calc))) setAmount(calc);
    }
  };

  const handleUnitRateChange = (val: string) => {
    setUnitRate(val);
    if (liters && val) {
      const calc = (parseFloat(liters) * parseFloat(val)).toFixed(2);
      if (!isNaN(Number(calc))) setAmount(calc);
    }
  };

  // Auto set fuel type rate from constants if user selects known fuel
  const handleFuelTypeChange = (type: string) => {
    setFuelType(type);
    const prod = FUEL_PRODUCTS.find((p) => p.nameUr === type || p.name === type);
    if (prod?.defaultRate) {
      const rateStr = prod.defaultRate.toString();
      setUnitRate(rateStr);
      if (liters) {
        const calc = (parseFloat(liters) * prod.defaultRate).toFixed(2);
        if (!isNaN(Number(calc))) setAmount(calc);
      }
    }
  };

  const validateForm = (): boolean => {
    setError(null);
    if (!customerId) {
      setError('برائے مہربانی گاہک منتخب کریں۔');
      return false;
    }
    if (!txnDate) {
      setError('تاریخ کا انتخاب لازمی ہے۔');
      return false;
    }
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setError('درست رقم درج کریں (رقم صفر سے زیادہ ہونی چاہیے)۔');
      return false;
    }

    if (txnType === 'CREDIT_SALE') {
      if (liters && unitRate) {
        const expected = Math.round(parseFloat(liters) * parseFloat(unitRate) * 100) / 100;
        const actual = Math.round(amtNum * 100) / 100;
        if (Math.abs(expected - actual) > 0.05) {
          setError(`کل رقم (${actual}) لیٹرز اور ریٹ کے ضربی حاصل (${expected}) کے برابر ہونی چاہیے۔`);
          return false;
        }
      }
    }

    return true;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowConfirmModal(true);
    }
  };

  const handleConfirmedSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      // Generate default description if empty
      let finalDescription = description.trim();
      if (!finalDescription) {
        if (txnType === 'CREDIT_SALE') {
          finalDescription = `${fuelType || 'پیٹرولیم'} ادھار فروخت ${liters ? `(${liters} لیٹر)` : ''}`;
        } else if (txnType === 'PAYMENT') {
          finalDescription = 'کیش / آن لائن وصولی ادائیگی';
        } else {
          finalDescription = `اکاؤنٹ ایڈجسٹمنٹ (${adjustmentDirection === 'DEBIT' ? 'نام' : 'جمع'})`;
        }
      }

      const payload = {
        customer_id: customerId,
        type: txnType,
        amount: parseFloat(amount),
        description: finalDescription,
        transaction_date: txnDate,
        fuel_type: txnType === 'CREDIT_SALE' ? fuelType : undefined,
        liters: txnType === 'CREDIT_SALE' && liters ? parseFloat(liters) : undefined,
        rate_per_liter: txnType === 'CREDIT_SALE' && unitRate ? parseFloat(unitRate) : undefined,
        vehicle_number: vehicleNo || undefined,
        slip_number: slipNo || undefined,
        adjustment_direction: txnType === 'ADJUSTMENT' ? adjustmentDirection : undefined,
        notes: notes || undefined,
      };

      const result = await api.createTransaction(payload);
      setSuccessTxnId(result.id);
      setShowConfirmModal(false);
    } catch (err: any) {
      setError(err?.message || 'لین دین محفوظ کرنے میں ناکامی ہوئی۔');
      setShowConfirmModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSuccessTxnId(null);
    setAmount('');
    setLiters('');
    setUnitRate('');
    setVehicleNo('');
    setSlipNo('');
    setDescription('');
    setNotes('');
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
              title="ڈیش بورڈ پر واپس"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl lg:text-2xl font-black text-slate-900 font-urdu">
                نیا لین دین / انٹری درج کریں
              </h1>
              <p className="text-xs text-slate-500 font-urdu mt-0.5">
                گجر پیٹرولیم کوٹ گجراں — مالیاتی کھاتے میں محفوظ اندراج
              </p>
            </div>
          </div>
        </div>

        {/* Success Banner */}
        {successTxnId && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-emerald-900 font-urdu">
              لین دین کامیابی سے درج کر لیا گیا!
            </h2>
            <p className="text-xs font-mono text-emerald-700">
              ٹرانزیکشن ID: <span className="font-bold">{successTxnId}</span>
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href={`/customers/${customerId}`}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold font-urdu transition-colors"
              >
                گاہک کا کھاتہ دیکھیں
              </Link>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold font-urdu transition-colors"
              >
                مزید نیا اندراج کریں
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-urdu flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Transaction Entry Form */}
        {!successTxnId && (
          <form onSubmit={handleFormSubmit} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            {/* Step 1: Transaction Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 font-urdu mb-2">
                لین دین کی قسم (Transaction Type) *
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTxnType('CREDIT_SALE')}
                  className={`py-3 px-4 rounded-xl border text-xs font-urdu font-bold flex flex-col items-center gap-1.5 transition-all ${
                    txnType === 'CREDIT_SALE'
                      ? 'bg-rose-50 border-rose-400 text-rose-800 ring-2 ring-rose-200'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Fuel className="w-5 h-5 text-rose-600" />
                  <span>ادھار پیٹرول / سیل (Debit)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTxnType('PAYMENT')}
                  className={`py-3 px-4 rounded-xl border text-xs font-urdu font-bold flex flex-col items-center gap-1.5 transition-all ${
                    txnType === 'PAYMENT'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800 ring-2 ring-emerald-200'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  <span>وصولی / رقم جمع (Credit)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTxnType('ADJUSTMENT')}
                  className={`py-3 px-4 rounded-xl border text-xs font-urdu font-bold flex flex-col items-center gap-1.5 transition-all ${
                    txnType === 'ADJUSTMENT'
                      ? 'bg-amber-50 border-amber-400 text-amber-800 ring-2 ring-amber-200'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Calculator className="w-5 h-5 text-amber-600" />
                  <span>کھاتہ ایڈجسٹمنٹ</span>
                </button>
              </div>
            </div>

            {/* Customer & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 font-urdu mb-1.5">
                  گاہک / کسٹمر منتخب کریں *
                </label>
                {loadingCustomers ? (
                  <div className="text-xs text-slate-400 py-2">گاہک لوڈ ہو رہے ہیں...</div>
                ) : (
                  <select
                    value={customerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-urdu focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- گاہک منتخب کریں --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name_ur || c.name} ({c.id}) — بقایا: {formatPKR(c.current_balance)}
                      </option>
                    ))}
                  </select>
                )}
                {selectedCustomer && (
                  <div className="mt-1.5 text-[11px] text-slate-500 font-urdu flex items-center justify-between">
                    <span>موجودہ بقایا: <strong className="font-mono text-slate-700">{formatPKR(selectedCustomer.current_balance)}</strong></span>
                    <span>حد: <strong className="font-mono text-slate-700">{formatPKR(selectedCustomer.credit_limit)}</strong></span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 font-urdu mb-1.5">
                  لین دین کی تاریخ *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={txnDate}
                    onChange={(e) => setTxnDate(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Adjustment Direction (If type is ADJUSTMENT) */}
            {txnType === 'ADJUSTMENT' && (
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
                <label className="block text-xs font-bold text-amber-900 font-urdu mb-2">
                  ایڈجسٹمنٹ کا رخ:
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-urdu text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="adjDir"
                      value="DEBIT"
                      checked={adjustmentDirection === 'DEBIT'}
                      onChange={() => setAdjustmentDirection('DEBIT')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>نام کسٹمر (Debit — بقایا میں اضافہ)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-urdu text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="adjDir"
                      value="CREDIT"
                      checked={adjustmentDirection === 'CREDIT'}
                      onChange={() => setAdjustmentDirection('CREDIT')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>جمع کسٹمر (Credit — بقایا میں کمی)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Credit Sale Specifics: Fuel, Vehicle, Liters, Rate */}
            {txnType === 'CREDIT_SALE' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div className="text-xs font-bold text-slate-800 font-urdu flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-teal-600" />
                  <span>پیٹرولیم ڈسپنسنگ تفصیلات</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-600 font-urdu mb-1">
                      پیٹرولیم کی قسم (Fuel Product)
                    </label>
                    <select
                      value={fuelType}
                      onChange={(e) => handleFuelTypeChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-urdu focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="High Octane Super">ہائی اوکٹین سپر (Super Petrol)</option>
                      <option value="High Speed Diesel">ہائی اسپیڈ ڈیزل (HSD)</option>
                      <option value="Mobil Oil / Lubricant">موبل آئل / لیوبریکنٹ</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 font-urdu mb-1">
                      گاڑی کا نمبر (Vehicle No.)
                    </label>
                    <input
                      type="text"
                      value={vehicleNo}
                      onChange={(e) => setVehicleNo(e.target.value)}
                      placeholder="مثلاً: LEA-1234 یا ٹریکٹر"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    {selectedCustomer?.vehicle_numbers && selectedCustomer.vehicle_numbers.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {selectedCustomer.vehicle_numbers.map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setVehicleNo(v)}
                            className="text-[10px] font-mono bg-slate-200 hover:bg-slate-300 px-1.5 py-0.5 rounded text-slate-700"
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-600 font-urdu mb-1">
                      مقدار لیٹرز میں (Liters)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={liters}
                      onChange={(e) => handleLitersChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 font-urdu mb-1">
                      نرخ فی لیٹر (Rate PKR)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={unitRate}
                      onChange={(e) => handleUnitRateChange(e.target.value)}
                      placeholder="280.00"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Total Amount & Slip Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 font-urdu mb-1.5">
                  کل رقم (روپے / PKR) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="absolute left-3 top-2.5 text-xs font-urdu text-slate-500 font-bold">
                    روپے
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 font-urdu mb-1.5">
                  پرچی / رسید نمبر (Slip No. / Reference)
                </label>
                <input
                  type="text"
                  value={slipNo}
                  onChange={(e) => setSlipNo(e.target.value)}
                  placeholder="مثلاً: SLIP-5432 یا بینک ٹرانسفر آئی ڈی"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Description & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 font-urdu mb-1.5">
                  تفصیل (Description)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="خودکار یا حسبِ ضرورت تفصیل درج کریں"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-urdu focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 font-urdu mb-1.5">
                  اضافی نوٹ (Notes)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="اختیاری نوٹ"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-urdu focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <Link
                href="/dashboard"
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-urdu font-medium transition-colors"
              >
                منسوخ کریں
              </Link>
              <button
                type="submit"
                className="px-6 py-2.5 bg-navy-900 hover:bg-navy-850 text-white rounded-xl text-xs font-urdu font-bold shadow-sm transition-colors flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>اندراج کی تصدیق اور محفوظ کریں</span>
              </button>
            </div>
          </form>
        )}

        {/* Financial Confirmation Modal */}
        <ConfirmationModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmedSubmit}
          loading={submitting}
          title="مالیاتی اندراج کی حتمی تصدیق"
          confirmText="جی ہاں، کھاتے میں درج کریں"
          cancelText="واپس تبدیل کریں"
          type="info"
        >
          <div className="space-y-3 text-xs font-urdu">
            <p className="text-slate-600">
              کیا آپ درج ذیل اندراج کو کھاتے میں مستقل طور پر درج کرنے کی توثیق کرتے ہیں؟
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-right">
              <div className="flex justify-between">
                <span className="text-slate-500">گاہک کا نام:</span>
                <span className="font-bold text-slate-900">{selectedCustomer?.name_ur || selectedCustomer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">قسم:</span>
                <span className="font-bold text-navy-900">
                  {txnType === 'CREDIT_SALE' ? 'ادھار پیٹرول فروخت (Debit)' : txnType === 'PAYMENT' ? 'وصولی / ادائیگی (Credit)' : 'کھاتہ ایڈجسٹمنٹ'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">کل رقم:</span>
                <span className="font-bold font-mono text-base text-rose-600">{formatPKR(amount)}</span>
              </div>
              {vehicleNo && (
                <div className="flex justify-between">
                  <span className="text-slate-500">گاڑی نمبر:</span>
                  <span className="font-mono text-slate-800">{vehicleNo}</span>
                </div>
              )}
              {liters && (
                <div className="flex justify-between">
                  <span className="text-slate-500">لیٹرز:</span>
                  <span className="font-mono text-slate-800">{liters} L @ PKR {unitRate}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">تاریخ:</span>
                <span className="font-mono text-slate-800">{txnDate}</span>
              </div>
            </div>

            <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              نوٹ: یہ رقم فوری طور پر کسٹمر کے گوگل شیٹس لیجر اور ڈیش بورڈ میزان پر لاگو ہو جائے گی۔
            </p>
          </div>
        </ConfirmationModal>
      </div>
    </AppShell>
  );
}

export default function NewTransactionPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="flex justify-center py-24">
            <LoadingSpinner message="صفحہ لوڈ ہو رہا ہے..." />
          </div>
        </AppShell>
      }
    >
      <NewTransactionContent />
    </Suspense>
  );
}
