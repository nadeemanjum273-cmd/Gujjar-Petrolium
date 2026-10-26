/**
 * Urdu Navigation, Business Identity, and Status Mappings
 * Gujjar Petrolium Kot Gujjran
 */

export const BUSINESS_IDENTITY = {
  name: "Gujjar Petrolium Kot Gujjran",
  nameUr: "گجر پیٹرولیم، کوٹ گجراں",
  subtitleUr: "کھاتہ اور وصولی مینجمنٹ سسٹم",
  manager: "Muhammad Asad",
  managerUr: "محمد اسد",
  location: "Kot Gujjran, Punjab, Pakistan",
  locationUr: "کوٹ گجراں، پنجاب، پاکستان",
  currency: "PKR",
  currencyUr: "روپے",
  timezone: "Asia/Karachi",
  direction: "rtl" as const,
  lang: "ur",
};

export interface NavItem {
  id: string;
  label: string;
  labelEn: string;
  href: string;
  icon: string;
}

export const URDU_NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "ڈیش بورڈ", labelEn: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { id: "customers", label: "کسٹمرز / گاہک", labelEn: "Customers", href: "/customers", icon: "Users" },
  { id: "new-transaction", label: "نیا لین دین", labelEn: "New Transaction", href: "/transactions/new", icon: "PlusCircle" },
  { id: "khata", label: "کھاتہ اور بقایا", labelEn: "Khata & Balances", href: "/khata", icon: "BookOpen" },
  { id: "reports", label: "واجبات کی رپورٹ", labelEn: "Recovery Report", href: "/reports", icon: "FileText" },
  { id: "reminders", label: "واٹس ایپ ریمائنڈرز", labelEn: "WhatsApp Reminders", href: "/reminders", icon: "MessageSquare" },
  { id: "receipts", label: "ادائیگی کی رسیدیں", labelEn: "Payment Receipts", href: "/receipts", icon: "Receipt" },
  { id: "settings", label: "سیٹنگز", labelEn: "Settings", href: "/settings", icon: "Settings" },
  { id: "audit", label: "آڈٹ لاگ", labelEn: "Audit Log", href: "/audit", icon: "ShieldCheck" },
  { id: "logout", label: "لاگ آؤٹ", labelEn: "Logout", href: "/logout", icon: "LogOut" },
];

export const STATUS_LABELS_UR: Record<string, { label: string; color: string }> = {
  // Customer statuses
  ACTIVE: { label: "فعال", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  INACTIVE: { label: "غیر فعال", color: "bg-gray-100 text-gray-800 border-gray-300" },
  BLOCKED: { label: "بلاک شدہ (روک دیا)", color: "bg-rose-100 text-rose-800 border-rose-300" },

  // Transaction statuses
  APPROVED: { label: "منظور شدہ", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  PENDING: { label: "زیر التواء", color: "bg-amber-100 text-amber-800 border-amber-300" },
  REJECTED: { label: "مسترد", color: "bg-rose-100 text-rose-800 border-rose-300" },

  // Transaction types
  CREDIT_SALE: { label: "ادھار ڈیزل / پیٹرول (ڈیبٹ)", color: "text-rose-700 bg-rose-50" },
  PAYMENT: { label: "وصولی / ادائیگی (کریڈٹ)", color: "text-emerald-700 bg-emerald-50" },
  ADJUSTMENT: { label: "ایڈجسٹمنٹ", color: "text-indigo-700 bg-indigo-50" },

  // Receipt queue statuses
  PENDING_VERIFICATION: { label: "تصدیق طلب", color: "bg-amber-100 text-amber-800 border-amber-300" },

  // Reminder delivery statuses
  QUEUED: { label: "قطار میں", color: "bg-blue-100 text-blue-800" },
  SENT: { label: "ارسال کر دیا گیا", color: "bg-indigo-100 text-indigo-800" },
  DELIVERED: { label: "پہنچ گیا", color: "bg-teal-100 text-teal-800" },
  READ: { label: "دیکھ لیا گیا", color: "bg-emerald-100 text-emerald-800" },
  FAILED: { label: "ناکام", color: "bg-rose-100 text-rose-800" },
};

export const FUEL_PRODUCTS = [
  { name: 'High Octane Super', nameUr: 'ہائی اوکٹین سپر', defaultRate: 280.0 },
  { name: 'High Speed Diesel', nameUr: 'ہائی اسپیڈ ڈیزل', defaultRate: 285.0 },
  { name: 'Mobil Oil / Lubricant', nameUr: 'موبل آئل / لیوبریکنٹ', defaultRate: 950.0 },
];

