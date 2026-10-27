'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'ur' | 'en';

interface Translations {
  [key: string]: {
    ur: string;
    en: string;
  };
}

export const DICTIONARY: Translations = {
  // Brand & Header
  brandTitle: { ur: 'گجر پیٹرولیم', en: 'Gujjar Petrolium' },
  brandSubtitle: { ur: 'کوٹ گجراں — کھاتہ اور وصولی مینجمنٹ', en: 'Kot Gujjran — Fuel & Ledger Management' },
  managerTitle: { ur: 'مجاز منیجر', en: 'Authorized Manager' },
  managerName: { ur: 'محمد اسد', en: 'Muhammad Asad' },
  selectLanguage: { ur: 'زبان منتخب کریں', en: 'Select Language' },
  online: { ur: 'آن لائن', en: 'Online' },
  logout: { ur: 'لاگ آؤٹ', en: 'Logout' },
  login: { ur: 'لاگ ان', en: 'Login' },

  // Navigation
  navDashboard: { ur: 'ڈیش بورڈ', en: 'Dashboard' },
  navSupplier: { ur: 'سپلائرز', en: 'Suppliers' },
  navCategories: { ur: 'کیٹیگریز / اقسام', en: 'Categories' },
  navCustomer: { ur: 'گاہک / کسٹمرز', en: 'Customers' },
  navFuels: { ur: 'فیول اقسام', en: 'Fuels' },
  navInvoices: { ur: 'انوائسز / بلز', en: 'Invoices' },
  navNewTransaction: { ur: 'نیا لین دین', en: 'New Transaction' },
  navReports: { ur: 'رپورٹس / کھاتہ', en: 'Reports' },
  navReminders: { ur: 'واٹس ایپ ریمائنڈرز', en: 'WhatsApp Reminders' },
  navReceipts: { ur: 'ادائیگی رسیدیں', en: 'Payment Receipts' },
  navSettings: { ur: 'سیٹنگز', en: 'Settings' },
  navAudit: { ur: 'آڈٹ لاگ', en: 'Audit Log' },
  navAboutAuthor: { ur: 'سسٹم معلومات', en: 'About System' },
  navWebAppearance: { ur: 'ڈسپلے اسٹائل', en: 'Web Appearance' },
  navProVersion: { ur: 'پرو ورژن حاصل کریں', en: 'Download Pro Ver.' },

  // Dashboard Stat Cards
  totalFuels: { ur: 'کل فیول اقسام', en: 'Total Fuels' },
  totalSupplier: { ur: 'کل سپلائرز', en: 'Total Suppliers' },
  totalInvoices: { ur: 'کل انوائسز / بل', en: 'Total Invoices' },
  totalCustomers: { ur: 'کل کسٹمرز', en: 'Total Customers' },
  totalReceivables: { ur: 'کل بقایا واجبات', en: 'Total Receivables' },
  totalOverdue: { ur: 'اوورڈیو کھاتے', en: 'Overdue Khata' },
  activeCustomers: { ur: 'فعال کسٹمرز', en: 'Active Customers' },
  todayBilling: { ur: 'آج کی بلنگ', en: "Today's Billing" },
  todayRecovery: { ur: 'آج کی وصولی', en: "Today's Recovery" },
  pendingReceipts: { ur: 'زیرِ تصدیق رسیدیں', en: 'Pending Receipts' },

  // Sections
  fuelOpeningStock: { ur: 'فیول اوپننگ اسٹاک', en: 'Fuel Opening Stock' },
  todaysBillingTable: { ur: 'آج کے بلنگ ریکارڈز', en: "Today's Billing" },
  recentTransactions: { ur: 'حالیہ لین دین', en: 'Recent Transactions' },
  overdueReminders: { ur: 'مجوزہ ریمائنڈرز', en: 'Overdue Reminders' },
  allCustomers: { ur: 'تمام کسٹمرز دیکھیں', en: 'View All Customers' },
  viewAll: { ur: 'سب دیکھیں', en: 'View All' },
  refresh: { ur: 'تازہ کریں', en: 'Refresh' },
  checkAccount: { ur: 'کھاتہ چیک کریں', en: 'Check Account' },
  daysOverdue: { ur: 'دن تاخیر', en: 'days overdue' },
  outstandingAmount: { ur: 'بقایا رقم:', en: 'Outstanding:' },

  // Table Columns
  colSr: { ur: '#', en: '#' },
  colBuildDate: { ur: 'تاریخ', en: 'Build Date' },
  colInvoiceNo: { ur: 'انوائس نمبر', en: 'Invoice No.' },
  colCustomerNo: { ur: 'گاہک نمبر', en: 'Customer No.' },
  colCustomerName: { ur: 'گاہک کا نام', en: 'Customer Name' },
  colEmail: { ur: 'ای میل / رابطہ', en: 'Email / Phone' },
  colAddress: { ur: 'پتہ / گاڑی', en: 'Address / Vehicle' },
  colTotal: { ur: 'کل رقم (PKR)', en: 'Total (PKR)' },
  colStatus: { ur: 'اسٹیٹس', en: 'Status' },
  colFuelType: { ur: 'فیول قسم', en: 'Fuel Type' },

  // Fuel types
  petrol: { ur: 'پیٹرول (Super)', en: 'Petrol' },
  diesel: { ur: 'ڈیزل (HSD)', en: 'Diesel' },
  cngOrOctane: { ur: 'ہائی اوکٹین / CNG', en: 'CNG / High Octane' },
  mobilOil: { ur: 'موبل آئل', en: 'Mobil Oil' },

  // Live Ticker
  liveStream: { ur: 'لائیو اسٹیشن فیڈ', en: 'LIVE STATION STREAM' },
  fuelRatesTicker: { ur: 'آج کے سرکاری نرخ', en: "Today's Official Rates" },
  stationActive: { ur: 'پمپ مکمل فعال اور آن لائن ہے', en: 'Kot Gujjran Station 100% Operational' },
  overdueNotice: { ur: '3 کھاتے 15 دن سے زائد اوورڈیو ہیں', en: '3 customer accounts overdue > 15 days' },
  powerBackup: { ur: 'سولر و جنریٹر بیک اپ فعال ہے', en: 'Solar & Generator Backup Online' },
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string) => string;
  isUrdu: boolean;
  dir: 'rtl' | 'ltr';
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'ur',
  setLang: () => {},
  toggleLang: () => {},
  t: (key: string) => key,
  isUrdu: true,
  dir: 'rtl',
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('ur');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem('gp_language') as Language | null;
    if (saved === 'en' || saved === 'ur') {
      setLangState(saved);
      document.documentElement.lang = saved;
      document.documentElement.dir = saved === 'ur' ? 'rtl' : 'ltr';
    } else {
      document.documentElement.lang = 'ur';
      document.documentElement.dir = 'rtl';
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gp_language', newLang);
      document.documentElement.lang = newLang;
      document.documentElement.dir = newLang === 'ur' ? 'rtl' : 'ltr';
    }
  };

  const toggleLang = () => {
    setLang(lang === 'ur' ? 'en' : 'ur');
  };

  const t = (key: string): string => {
    const entry = DICTIONARY[key];
    if (!entry) return key;
    return entry[lang] || entry['en'] || key;
  };

  const isUrdu = lang === 'ur';
  const dir: 'rtl' | 'ltr' = isUrdu ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t, isUrdu, dir }}>
      <div dir={dir} className={isUrdu ? 'font-urdu' : 'font-sans'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
