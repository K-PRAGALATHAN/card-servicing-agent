import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Card Servicing — Auditor Console",
  description: "Bank staff console for monitoring AI-agent conversations and audit trails.",
};

// Apply the saved theme before first paint to avoid a flash.
const themeInit = `(function(){try{var t=localStorage.getItem('console.theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
