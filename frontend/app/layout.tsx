import type { Metadata } from 'next';
import './globals.css';
import { BUSINESS_IDENTITY } from '@/lib/constants';

export const metadata: Metadata = {
  title: `${BUSINESS_IDENTITY.nameUr} — ${BUSINESS_IDENTITY.subtitleUr}`,
  description: 'کھاتہ اور وصولی مینجمنٹ سسٹم — کوٹ گجراں، پنجاب، پاکستان',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ur" dir="rtl">
      <body className="min-h-screen bg-slate-50 text-slate-900 font-urdu antialiased selection:bg-teal-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
