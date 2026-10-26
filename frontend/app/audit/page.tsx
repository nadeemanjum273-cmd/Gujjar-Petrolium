'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Clock,
  UserCheck,
  FileText,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Edit,
  RefreshCw,
  Search,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { formatKarachiDateTime } from '@/lib/formatters';
import { AuditLog } from '@/types';

export default function AuditLogPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAuditLogs();
      setAuditLogs(data.reverse()); // most recent first
    } catch (err: any) {
      setError(err?.message || 'آڈٹ لاگ لوڈ کرنے میں ناکامی ہوئی۔');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const filteredLogs = auditLogs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.actor_name?.toLowerCase().includes(term) ||
      log.action?.toLowerCase().includes(term) ||
      log.entity_id?.toLowerCase().includes(term) ||
      log.details?.toLowerCase().includes(term) ||
      log.details_ur?.toLowerCase().includes(term)
    );
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
            <PlusCircle className="w-3 h-3" />
            <span>تخلیق / نیا اندراج</span>
          </span>
        );
      case 'APPROVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800">
            <CheckCircle2 className="w-3 h-3" />
            <span>منظوری</span>
          </span>
        );
      case 'REJECT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
            <XCircle className="w-3 h-3" />
            <span>مسترد</span>
          </span>
        );
      case 'UPDATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
            <Edit className="w-3 h-3" />
            <span>ترمیم</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            <span>{action}</span>
          </span>
        );
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 font-urdu">
              سسٹم آڈٹ لاگ اور ٹائم لائن
            </h1>
            <p className="text-xs lg:text-sm text-slate-500 font-urdu mt-1">
              تمام مالیاتی اور انتظامی کارروائیوں کا ناقابلِ تنسیخ ریکارڈ
            </p>
          </div>
          <button
            onClick={loadAuditLogs}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تازہ کریں</span>
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="آڈٹ لاگ میں تلاش کریں (نام، کارروائی، آئی ڈی)..."
              className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-urdu focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Timeline / Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 font-urdu">
              ریکارڈ شدہ سرگرمیاں ({filteredLogs.length})
            </h2>
            <span className="text-xs text-slate-400 font-urdu">
              گوگل شیٹس آڈٹ ٹیب
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner text="آڈٹ لاگ لوڈ ہو رہا ہے..." />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12">
              <EmptyState
                title="کوئی آڈٹ ریکارڈ نہیں ملا"
                description="فلٹر کے مطابق کوئی ریکارڈ دستیاب نہیں ہے۔"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 font-urdu border-b border-slate-200/80">
                    <th className="py-3 px-4 font-semibold">وقت و تاریخ</th>
                    <th className="py-3 px-4 font-semibold">صارف / فاعل</th>
                    <th className="py-3 px-4 font-semibold">کارروائی (Action)</th>
                    <th className="py-3 px-4 font-semibold">ہدف شناخت (Entity ID)</th>
                    <th className="py-3 px-4 font-semibold">تفصیلات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {formatKarachiDateTime(log.timestamp)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                          <span>{log.actor_name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {log.actor_role}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-800 whitespace-nowrap">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {log.entity_type}: {log.entity_id}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-urdu">
                        <div>{log.details_ur || log.details}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
