import './globals.css';
import type { Metadata } from 'next';
import { LayoutShell } from '@/components/layout-shell';

export const metadata: Metadata = {
  title: 'Jquant ver 1.0 | 퀀트 알고리즘 트레이딩 플랫폼',
  description: 'Jquant ver 1.0 - KIS 실시간 연동 & Gemini AI 멀티모달 퀀트 플랫폼',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                if (/Loading chunk .* failed/.test(e.message) || (e.error && e.error.name === 'ChunkLoadError')) {
                  if (!window.sessionStorage.getItem('chunk_retry')) {
                    window.sessionStorage.setItem('chunk_retry', 'true');
                    window.location.reload();
                  }
                }
              });
              window.addEventListener('load', function() {
                window.sessionStorage.removeItem('chunk_retry');
              });
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}

