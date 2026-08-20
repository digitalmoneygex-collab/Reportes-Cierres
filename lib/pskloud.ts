import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getPskloudPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host:     process.env.DB_HOST     || 'localhost',
      user:     process.env.DB_USER     || 'root',
      password: process.env.DB_PASS     || '',
      database: process.env.DB_NAME     || 'adminzuilia',
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      charset: 'utf8',
    });
  }
  return pool;
}
