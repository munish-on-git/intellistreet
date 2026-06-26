import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Intellistreet — Smart City Civic Platform',
  description: 'An AI-powered civic platform allowing citizens to identify, report, verify, track, and resolve community issues collaboratively.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body suppressHydrationWarning className="bg-[#0b0f19] text-gray-100 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}

