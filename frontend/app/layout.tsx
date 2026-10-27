import type { Metadata } from 'next';
import './globals.css';
import { BUSINESS_IDENTITY } from '@/lib/constants';
import { LanguageProvider } from '@/lib/LanguageContext';

export const metadata: Metadata = {
  title: `${BUSINESS_IDENTITY.nameUr} — ${BUSINESS_IDENTITY.name}`,
  description: 'گجر پیٹرولیم کوٹ گجراں — کھاتہ، فیول اور وصولی مینجمنٹ سسٹم',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ur" dir="rtl">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-teal-500 selection:text-white">
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
