const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

c = c.replace(/ðŸ’³ Punto de Venta/g, '💳 Punto de Venta');
c = c.replace(/ðŸ’µ DÃ³lares Efectivo/g, '💵 Dólares Efectivo');
c = c.replace(/ðŸ’´ Bs Efectivo/g, '💴 Bs Efectivo');
c = c.replace(/ðŸ ¦ Transferencia/g, '🏦 Transferencia');
c = c.replace(/ðŸ“± Pago MÃ³vil/g, '📱 Pago Móvil');
c = c.replace(/ðŸ“‹ CrÃ©dito/g, '📋 Crédito');
c = c.replace(/ðŸŸ¡ Binance/g, '🟡 Binance');
c = c.replace(/ðŸ’¸ Zelle/g, '💸 Zelle');
c = c.replace(/ðŸ”µ Bio Pago/g, '🔵 Bio Pago');

// El modal de calculadora
c = c.replace(/ðŸ§® Calculadora de Vuelto/g, '🧮 Calculadora de Vuelto');
c = c.replace(/ðŸ§® Calculadora/g, '🧮 Calculadora');

// Otros símbolos
c = c.replace(/Â¡Montos cuadrados perfectamente! âœ…/g, '¡Montos cuadrados perfectamente! ✅');
c = c.replace(/âœ•/g, '✕');

// Also some random mangled emojis like Y or o
c = c.replace(/Y' Punto de Venta/g, '💳 Punto de Venta');
c = c.replace(/Y' Dlares Efectivo/g, '💵 Dólares Efectivo');
c = c.replace(/Y' Bs Efectivo/g, '💴 Bs Efectivo');
c = c.replace(/Y\? Transferencia/g, '🏦 Transferencia');
c = c.replace(/Y" Pago Mvil/g, '📱 Pago Móvil');
c = c.replace(/Y"< CrǸdito/g, '📋 Crédito');
c = c.replace(/YY Binance/g, '🟡 Binance');
c = c.replace(/Y' Zelle/g, '💸 Zelle');
c = c.replace(/Y" Bio Pago/g, '🔵 Bio Pago');

c = c.replace(/Y Calculadora de Vuelto/g, '🧮 Calculadora de Vuelto');
c = c.replace(/Y Calculadora/g, '🧮 Calculadora');
c = c.replace(/o /g, '✕');

c = c.replace(/\?\? Calculadora/g, '🧮 Calculadora');

fs.writeFileSync('app/dashboard/page.tsx', c, 'utf8');
