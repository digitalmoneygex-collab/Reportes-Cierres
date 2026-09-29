const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

const replacement = `<button className="btn btn-ghost btn-sm" style={{ border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', background: 'rgba(99,102,241,0.1)' }} onClick={() => setCalcOpen(true)}>
              🧮 Calculadora
            </button>
            <button className="btn btn-ghost btn-sm" disabled={isRefreshing}`;

c = c.replace('<button className="btn btn-ghost btn-sm" disabled={isRefreshing}', replacement);

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log("Done");
