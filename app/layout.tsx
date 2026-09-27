import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HYDROVERSE // Combat Systems',
  description: 'Naval combat arena — festival on the water',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
