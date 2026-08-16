import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reportes de Cierres',
  description: 'Sistema de cierres diarios con Evolution API y Supabase',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
