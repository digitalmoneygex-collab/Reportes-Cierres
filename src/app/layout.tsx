import './globals.css';

export const metadata = {
  title: 'Reportes de Cierres',
  description: 'Sistema de cierre de caja con Evolution API + Supabase',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
