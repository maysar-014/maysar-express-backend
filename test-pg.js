const { Client } = require('pg');
const client = new Client({
    connectionString: 'postgresql://maysar_user:M%40ys4r2026%21Db@127.0.0.1:5432/maysar_dev'
});

async function test() {
    try {
        await client.connect();
        console.log('Successfully connected to the database');
        const res = await client.query('SELECT current_database(), current_user, version();');
        console.log(res.rows[0]);
        await client.end();
    } catch (err) {
        console.error('Connection error', err.stack);
        process.exit(1);
    }
}

test();
