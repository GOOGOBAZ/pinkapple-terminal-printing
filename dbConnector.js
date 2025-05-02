// require('dotenv').config({ path: './.env' });
// const mysql = require('mysql2');
// const NodeCache = require("node-cache");

// const cache = new NodeCache();

// const mainDbConfig = {
//   host: process.env.HOST,
//   port: process.env.DB_PORT,
//   user: process.env.DB_USER,
//   password: process.env.DB_PW,
//   connectionLimit: process.env.DB_CONN_LIMMIT,
//   database: process.env.DB_NAME,
//   insecureAuth: process.env.DB_INSECURE,
// };

// // Helper function to log connection events
// const logConnectionEvents = (connection, dbName) => {
//   console.log(`${dbName} Connection established`);
//   connection.on('error', (err) => {
//     console.error(new Date(), `${dbName} MySQL error`, err.code);
//   });
//   connection.on('close', (err) => {
//     console.error(new Date(), `${dbName} MySQL close`, err);
//   });
// };

// // Create a promise-based connection pool for the main database
// const connect = mysql.createPool(mainDbConfig).promise();
// connect.on('connection', (connection) => logConnectionEvents(connection, 'Main DB'));

// // Retrieve tenant DB configuration from main database
// const getTenantDbConfig = async (companyAlias) => {
//   return new Promise((resolve, reject) => {
//     const tenantDetailsQuery = 'CALL getTenantDetails(?)';
//     connect.query(tenantDetailsQuery, [companyAlias], (err, rows) => {
//       if (err) {
//         console.error(`Error getting tenant details for ${companyAlias}`, err);
//         reject(err);
//       } else if (rows[0] && rows[0].length === 0) {
//         reject(new Error(`No tenant details found for alias ${companyAlias}`));
//       } else {
//         const tenantConfig = {
//           host: rows[0][0].dbHostName,
//           port: rows[0][0].dbPort,
//           user: rows[0][0].dbUserName,
//           password: rows[0][0].dbPassword,
//           connectionLimit: rows[0][0].dbConnLimit,
//           database: rows[0][0].dbName,
//           insecureAuth: true,
//         };
//         console.log('Tenant database config:', tenantConfig);
//         resolve(tenantConfig);
//       }
//     });
//   });
// };

// // Create a tenant pool connection and cache it
// const connect2 = async (companyAlias) => {
//   const cacheKey = `pool_${companyAlias}`;
//   const cachedPool = cache.get(cacheKey);

//   if (cachedPool) {
//     console.log('Retrieving cached pool connection...');
//     return cachedPool;
//   }

//   const tenantDbConfig = await getTenantDbConfig(companyAlias);
//   const pool = mysql.createPool(tenantDbConfig).promise();

//   pool.on('connection', (connection) => logConnectionEvents(connection, 'Tenant DB'));
  
//   console.log('Creating new pool connection...');
//   cache.set(cacheKey, pool);
//   console.log("Connected to tenant database:", tenantDbConfig.database);
//   return pool;
// };

// module.exports = {
//   connect,
//   connect2,
// };



/*****************************************************************
 * dbPool.js · MySQL pools (MAIN + per‑tenant)
 *             — now pinned to Africa/Nairobi (UTC+03:00)
 *****************************************************************/

require('dotenv').config({ path: './.env' });
const mysql     = require('mysql2');          // keep same import – we still use .promise() later
const NodeCache = require('node-cache');

/* ////////////////////////////////////////////////////////////////////
   helpers
   //////////////////////////////////////////////////////////////////// */
const cache           = new NodeCache({
  stdTTL: Number(process.env.POOL_CACHE_TTL || 0),  // 0 ⇒ never expire
  checkperiod: 120
});
const nowISO         = () => new Date().toISOString();
const NAIROBI_OFFSET = '+03:00';                   // constant for clarity

const logConnectionEvents = (conn, label) => {
  console.log(`[${nowISO()}] ${label} connection established`);
  conn.on('error',  err => console.error(`[${nowISO()}] ${label} error`,  err));
  conn.on('close',  err => console.error(`[${nowISO()}] ${label} closed`, err));
};

/* Convert every server session to Africa/Nairobi – use callback style so we
   don't rely on promise wrapper inside the raw connection object. */
const enforceNairobiSession = (conn) => {
  conn.query(`SET time_zone = '${NAIROBI_OFFSET}'`, (err) => {
    if (err) console.error('Could not SET time_zone', err);
  });
};

/* ////////////////////////////////////////////////////////////////////
   MAIN DATABASE POOL  (object name preserved)
   //////////////////////////////////////////////////////////////////// */
const mainDbConfig = {
  host            : process.env.HOST,
  port            : Number(process.env.DB_PORT) || 3306,
  user            : process.env.DB_USER,
  password        : process.env.DB_PW,
  database        : process.env.DB_NAME,
  connectionLimit : Number(process.env.DB_CONN_LIMMIT) || 10,
  insecureAuth    : process.env.DB_INSECURE === 'true',
  timezone        : NAIROBI_OFFSET          // node‑side TZ handling
};

/* Use .promise() so callers can await pool.query/execute, while the low‑level
   connection objects (from the 'connection' event) remain callback‑style. */
const connect = mysql.createPool(mainDbConfig).promise();
connect.on('connection', (c) => {
  logConnectionEvents(c, 'MAIN‑DB');
  enforceNairobiSession(c);                // server‑side TZ handling
});

/* ////////////////////////////////////////////////////////////////////
   TENANT CONFIG fetcher (stored proc → creds)
   //////////////////////////////////////////////////////////////////// */
async function getTenantDbConfig(companyAlias) {
  const [rows] = await connect.query('CALL getTenantDetails(?)', [companyAlias]);

  if (!rows[0] || rows[0].length === 0) {
    throw new Error(`No tenant details found for alias "${companyAlias}"`);
  }

  const t = rows[0][0];
  return {
    host            : t.dbHostName,
    port            : Number(t.dbPort) || 3306,
    user            : t.dbUserName,
    password        : t.dbPassword,
    database        : t.dbName,
    connectionLimit : Number(t.dbConnLimit) || 5,
    insecureAuth    : true,
    timezone        : NAIROBI_OFFSET
  };
}

/* ////////////////////////////////////////////////////////////////////
   TENANT POOL with caching  (export name preserved)
   //////////////////////////////////////////////////////////////////// */
async function connect2(companyAlias) {
  const key    = `tenant_${companyAlias}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const cfg  = await getTenantDbConfig(companyAlias);
  const pool = mysql.createPool(cfg).promise();

  pool.on('connection', (c) => {
    logConnectionEvents(c, `TENANT‑DB:${companyAlias}`);
    enforceNairobiSession(c);
  });

  cache.set(key, pool);
  console.log(`[${nowISO()}] Created pool for tenant "${companyAlias}"`);
  return pool;
}

/* ////////////////////////////////////////////////////////////////////
   EXPORTS — unchanged API
   //////////////////////////////////////////////////////////////////// */
module.exports = {
  connect,  // main database pool (Africa/Nairobi)
  connect2  // function → tenant pool (Africa/Nairobi, cached)
};
/* ////////////////////////////////////////////////////////////////////
   END OF FILE
   //////////////////////////////////////////////////////////////////// */
