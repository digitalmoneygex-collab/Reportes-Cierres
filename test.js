const mysql = require('mysql2/promise');

const DB = {
  host:     'localhost',
  user:     'root',
  password: '1234',
  database: 'adminzuilia',
};

async function checkOperti() {
  const conn = await mysql.createConnection(DB);
  const today = new Date().toISOString().split('T')[0];
  
  const [rows] = await conn.query(`SELECT tipodoc, documento, totbruto, totneto, totimpuest, totalfinal FROM operti WHERE DATE(fechacrea) = ? OR DATE(emision) = ?`, [today, today]);
  
  console.log('Documentos en operti de hoy:');
  console.table(rows);

  process.exit(0);
}

checkOperti().catch(console.error);
