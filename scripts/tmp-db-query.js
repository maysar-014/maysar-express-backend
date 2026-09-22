const fs = require('fs');
const { Client } = require('pg');
const q = process.argv[2];
const outFile = process.argv[3] || 'logs/db-query-result.json';
const c = new Client({ connectionString: 'postgresql://maysar_user:M%40ys4r2026%21Db@localhost:5433/maysar_dev' });
c.connect()
  .then(() => c.query(q))
  .then((r) => { fs.writeFileSync(outFile, JSON.stringify(r.rows, null, 1)); return c.end(); })
  .catch((e) => { fs.writeFileSync(outFile, 'ERR:' + e.message); return c.end(); });
