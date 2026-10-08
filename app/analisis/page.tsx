'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface ItemAnalisis {
  nombre: string;
  categoria: string;
  total: number;
  byHour: number[];
  byShift: number[];
}

export default function AnalisisPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ItemAnalisis[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [user, setUser] = useState<any>(null);

  // Verificación de sesión y carga inicial
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (!d.ok || d.user?.rol !== 'SUPERVISOR') {
          router.push('/login');
        } else {
          setUser(d.user);
          // Por defecto: Hoy
          const today = new Date();
          const y = today.getFullYear();
          const m = String(today.getMonth() + 1).padStart(2, '0');
          const day = String(today.getDate()).padStart(2, '0');
          const todayStr = `${y}-${m}-${day}`;
          setStartDate(todayStr);
          setEndDate(todayStr);
        }
      });
  }, [router]);

  useEffect(() => {
    if (!startDate || !endDate || !user) return;
    loadData(startDate, endDate);
  }, [startDate, endDate, user]);

  const loadData = async (start: string, end: string) => {
    setLoading(true);
    try {
      // Ajustamos para incluir todo el día de end
      const startIso = new Date(`${start}T00:00:00-04:00`).toISOString();
      const endIso = new Date(`${end}T23:59:59-04:00`).toISOString();
      const res = await fetch(`/api/analisis?start=${startIso}&end=${endIso}`);
      const json = await res.json();
      if (json.ok) {
        setData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (days: number) => {
    const today = new Date();
    const endStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const start = new Date(today);
    start.setDate(start.getDate() - days + 1);
    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    
    setStartDate(startStr);
    setEndDate(endStr);
  };

  // Agrupamos por categoría
  const groupedData = useMemo(() => {
    const groups: Record<string, ItemAnalisis[]> = {
      'pasteles': [],
      'burguer': [],
      'bebidas': [],
      'reposteria': [],
      'otros': []
    };
    
    data.forEach(item => {
      const cat = groups[item.categoria] ? item.categoria : 'otros';
      groups[cat].push(item);
    });

    return groups;
  }, [data]);

  const CATEGORY_LABELS: Record<string, string> = {
    'pasteles': '🥟 Pasteles & Pasapalos',
    'burguer': '🍔 Burguer',
    'bebidas': '🥤 Bebidas',
    'reposteria': '🎂 Repostería',
    'otros': '📦 Otros'
  };

  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  if (!user) return <div style={{ padding: 40, color: '#e8edf5' }}>Verificando permisos...</div>;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Análisis de Ventas</h1>
          <p className="page-subtitle" style={{ margin: 0, marginTop: '8px' }}>
            Métricas de movimiento de artículos por hora y turnos.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Desde</label>
            <input 
              type="date" 
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{ background: '#0f172a', border: '1px solid #334155', color: 'white', padding: '8px 12px', borderRadius: '8px', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Hasta</label>
            <input 
              type="date" 
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              style={{ background: '#0f172a', border: '1px solid #334155', color: 'white', padding: '8px 12px', borderRadius: '8px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginLeft: 'auto' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => handleQuickSelect(1)}>Hoy</button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleQuickSelect(2)}>2 días</button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleQuickSelect(3)}>3 días</button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleQuickSelect(7)}>Semana</button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleQuickSelect(30)}>Mes</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>Analizando datos históricos...</div>
      ) : data.length === 0 ? (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>No hay ventas registradas en este periodo.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {Object.entries(groupedData).map(([catKey, items]) => {
            if (items.length === 0) return null;

            return (
              <div key={catKey} className="card">
                <h2 style={{ fontSize: '16px', color: '#e8edf5', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                  {CATEGORY_LABELS[catKey]}
                </h2>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                        <th style={{ padding: '8px', width: '250px' }}>Artículo</th>
                        <th style={{ padding: '8px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>Turno 1<br/><span style={{fontSize: '10px'}}>(6am - 2pm)</span></th>
                        <th style={{ padding: '8px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>Turno 2<br/><span style={{fontSize: '10px'}}>(2pm - 10pm)</span></th>
                        <th style={{ padding: '8px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>Turno 3<br/><span style={{fontSize: '10px'}}>(10pm - 6am)</span></th>
                        <th style={{ padding: '8px', textAlign: 'center', color: '#e8edf5' }}>TOTAL<br/><span style={{fontSize: '10px'}}>Periodo</span></th>
                        <th style={{ padding: '8px', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const isExpanded = expandedItem === `${catKey}_${item.nombre}`;
                        const maxHour = Math.max(...item.byHour);
                        return (
                          <React.Fragment key={idx}>
                            <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid rgba(51,65,85,0.4)', background: isExpanded ? 'rgba(51,65,85,0.2)' : 'transparent' }}>
                              <td style={{ padding: '10px 8px', color: '#e8edf5', fontWeight: '500' }}>{item.nombre}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', color: '#94a3b8', background: 'rgba(255,255,255,0.02)' }}>
                                {item.byShift[0] > 0 ? <strong style={{ color: '#818cf8' }}>{item.byShift[0]}</strong> : '-'}
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', color: '#94a3b8', background: 'rgba(255,255,255,0.02)' }}>
                                {item.byShift[1] > 0 ? <strong style={{ color: '#818cf8' }}>{item.byShift[1]}</strong> : '-'}
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', color: '#94a3b8', background: 'rgba(255,255,255,0.02)' }}>
                                {item.byShift[2] > 0 ? <strong style={{ color: '#818cf8' }}>{item.byShift[2]}</strong> : '-'}
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', color: '#34d399', fontWeight: 'bold' }}>
                                {item.total}
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                <button 
                                  onClick={() => setExpandedItem(isExpanded ? null : `${catKey}_${item.nombre}`)}
                                  style={{ background: 'transparent', border: '1px solid #475569', color: '#e8edf5', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px', fontSize: '11px' }}
                                >
                                  {isExpanded ? 'Ocultar' : 'Por Hora'}
                                </button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr style={{ borderBottom: '1px solid rgba(51,65,85,0.4)', background: 'rgba(15,23,42,0.4)' }}>
                                <td colSpan={6} style={{ padding: '16px' }}>
                                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Desglose por horas (00:00 - 23:59)</div>
                                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {item.byHour.map((qty, h) => {
                                      const intensity = maxHour > 0 ? (qty / maxHour) : 0;
                                      return (
                                        <div key={h} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '28px' }}>
                                          <div style={{ 
                                            width: '100%', 
                                            height: '24px', 
                                            background: qty > 0 ? `rgba(99,102,241,${0.2 + intensity * 0.8})` : '#1e293b', 
                                            borderRadius: '4px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: qty > 0 ? 'white' : '#475569',
                                            fontSize: '11px', fontWeight: qty > 0 ? 'bold' : 'normal'
                                          }}>
                                            {qty > 0 ? qty : ''}
                                          </div>
                                          <div style={{ fontSize: '9px', marginTop: '4px', color: '#64748b' }}>{h}h</div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
