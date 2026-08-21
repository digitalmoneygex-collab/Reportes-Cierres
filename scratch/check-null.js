const mysql = require('mysql2/promise');

const DB = {
  host:     'localhost',
  user:     'root',
  password: '1234',
  database: 'adminzuilia',
};

async function test() {
  const conn = await mysql.createConnection(DB);
  const today = new Date().toISOString().split('T')[0];
  const [rows] = await conn.query(`SELECT documento, fechayhora, nombre FROM opermv WHERE DATE(fechadoc) = ?`, [today]);
  
  const nulls = rows.filter(r => !r.fechayhora);
  console.log(`Null fechayhora rows: ${nulls.length} / ${rows.length}`);
  if (nulls.length > 0) {
    console.log(nulls.slice(0, 5));
  }
  process.exit();
}
test();
