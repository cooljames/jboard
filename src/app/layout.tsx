import './globals.css';
import type { Metadata } from 'next';
import { LayoutShell } from '@/components/layout-shell';

export const metadata: Metadata = {
  title: 'QuantAntigravity-KIS Web v2.0.0 | Dynamic Quant Trading Tower',
  description: 'KIS Open API + Neon Serverless + Gemini 2.0 Flash Dynamic Multi-Strategy Trading Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}

