'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Plus,
  BookOpen,
  Phone,
  CheckCircle2,
  XCircle,
  Truck,
  Filter,
  RefreshCw,
  X,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { formatPKR, formatPakistaniPhone } from '@/lib/formatters';
import { Customer, CustomerStatus } from '@/types';
import { DEMO_CUSTOMERS } from '@/lib/demoData';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(DEMO_CUSTOMERS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [nameUr, setNameUr] = useState('');
  const [phone, setPhone] = useState('');
  const [creditLimit, setCreditLimit] = useState('100000');
  const [vehicles, setVehicles] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [whatsappConsent, setWhatsappConsent] = useState(true);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.getCustomers();
      if (data && data.length > 0) {
        setCustomers(data);
      } else {
        setCustomers(DEMO_CUSTOMERS);
      }
    } catch (err: any) {
      console.error('Failed to fetch customers:', err);
      setCustomers(DEMO_CUSTOMERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('گاہک کا نام درج کرنا لازمی ہے۔');
      return;
    }
    if (!phone.trim()) {
      setFormError('فون نمبر درج کرنا لازمی ہے۔');
      return;
    }

    try {
      setSubmitting(true);
      const vehicleList = vehicles
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);

      await api.createCustomer({
        name: name.trim(),
        name_ur: nameUr.trim() || undefined,
        phone: phone.trim(),
        credit_limit: parseFloat(creditLimit) || 50000,
        vehicle_numbers: vehicleList,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        whatsapp_consent: whatsappConsent,
      });

      setIsAddModalOpen(false);
      // Reset form
      setName('');
      setNameUr('');
      setPhone('');
      setCreditLimit('100000');
      setVehicles('');
      setAddress('');
      setNotes('');
      setWhatsappConsent(true);

      // Refresh list
      fetchCustomers();
    } catch (err: any) {
      setFormError(err?.message || 'گاہک کو محفوظ کرنے میں ناکامی ہوئی۔');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter customers by search and status
  const filteredCustomers = customers.filter((c) => {
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.name_ur && c.name_ur.includes(q)) ||
      c.id.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.vehicle_numbers && c.vehicle_numbers.some((v) => v.toLowerCase().includes(q)));
    return matchesStatus && matchesSearch;
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 font-urdu">
              کسٹمرز اور کھاتہ دار
            </h1>
            <p className="text-xs lg:text-sm text-slate-500 font-urdu mt-1">
              رجسٹرڈ کسٹمرز، ادھار حد، اور واٹس ایپ رضامندی کا انتظام
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm font-urdu transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>نیا گاہک شامل کریں</span>
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="گاہک کا نام، شناختی نمبر، فون یا گاڑی نمبر تلاش کریں..."
              className="w-full pr-10 pl-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-urdu shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm w-full sm:w-auto text-xs font-urdu">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === 'ALL'
                    ? 'bg-navy-900 text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                تمام
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                فعال
              </button>
              <button
                onClick={() => setStatusFilter('BLOCKED')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === 'BLOCKED'
                    ? 'bg-rose-600 text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                بلاک شدہ
              </button>
            </div>

            <button
              onClick={fetchCustomers}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 shadow-sm transition-colors"
              title="تازہ کریں"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Display */}
        {loading ? (
          <LoadingSpinner message="گاہکوں کی فہرست لوڈ کی جا رہی ہے..." />
        ) : filteredCustomers.length === 0 ? (
          <EmptyState
            title="کوئی گاہک نہیں ملا"
            description="درج کردہ تلاش یا فلٹر کے مطابق کوئی ریکارڈ دستیاب نہیں ہے۔"
          />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 font-urdu border-b border-slate-200/60">
                  <tr>
                    <th className="py-3.5 px-4">کسٹمر ID</th>
                    <th className="py-3.5 px-4">نام اور موبائل نمبر</th>
                    <th className="py-3.5 px-4">گاڑی / ٹریکٹر رجسٹریشن</th>
                    <th className="py-3.5 px-4">ادھار حد</th>
                    <th className="py-3.5 px-4">موجودہ بقایا</th>
                    <th className="py-3.5 px-4">واٹس ایپ رضامندی</th>
                    <th className="py-3.5 px-4">اسٹیٹس</th>
                    <th className="py-3.5 px-4 text-center">کھاتہ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-urdu">
                  {filteredCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                        {c.id}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{c.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono ltr-text mt-0.5">
                          {formatPakistaniPhone(c.phone)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {c.vehicle_numbers && c.vehicle_numbers.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {c.vehicle_numbers.map((v) => (
                              <span
                                key={v}
                                className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold"
                              >
                                {v}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-600">
                        {formatPKR(c.credit_limit)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900">
                          {formatPKR(c.current_balance)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {c.whatsapp_consent ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            رضامند
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                            انکار
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <Link
                          href={`/customers/${c.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-navy-50 hover:bg-navy-100 text-navy-800 rounded-lg text-xs font-semibold font-urdu transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-navy-700" />
                          <span>کھاتہ دیکھیں</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Customer Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900 font-urdu">نیا گاہک رجسٹر کریں</h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-urdu">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateCustomer} className="space-y-4 font-urdu text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      گاہک کا نام (English) *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Tariq Gujjar"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      اردو نام (اختیاری)
                    </label>
                    <input
                      type="text"
                      value={nameUr}
                      onChange={(e) => setNameUr(e.target.value)}
                      placeholder="مثال: چوہدری طارق گجر"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      موبائل نمبر (WhatsApp) *
                    </label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0300-1234567 یا 92300..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono ltr-text text-left"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      ادھار کی حد (PKR)
                    </label>
                    <input
                      type="number"
                      step="1000"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    گاڑی / ٹریکٹر نمبرز (کوما سے الگ کریں)
                  </label>
                  <input
                    type="text"
                    value={vehicles}
                    onChange={(e) => setVehicles(e.target.value)}
                    placeholder="GLT-4412, LXZ-890, FD-2201"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono ltr-text"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">پتہ / علاقہ</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="کوٹ گجراں، نزد چوک..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="consentCheck"
                    checked={whatsappConsent}
                    onChange={(e) => setWhatsappConsent(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                  />
                  <label htmlFor="consentCheck" className="text-slate-700 font-semibold cursor-pointer">
                    کسٹمر واٹس ایپ ریکوری اور بل الرٹس وصول کرنے پر رضامند ہے
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-semibold"
                  >
                    منسوخ کریں
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors font-semibold shadow-sm"
                  >
                    {submitting ? 'محفوظ ہو رہا ہے...' : 'گاہک محفوظ کریں'}
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
