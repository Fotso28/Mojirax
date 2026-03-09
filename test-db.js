const { Client } = require('pg');

const credentials = [
    { user: 'admin', password: 'password', database: 'co_founder_db' },
    { user: 'postgres', password: 'password', database: 'postgres' },
    { user: 'postgres', password: '', database: 'postgres' },
    { user: 'postgres', password: 'admin', database: 'postgres' },
];

async function testConnections() {
    for (const cred of credentials) {
        const client = new Client({
            host: 'localhost',
            port: 5432,
            user: cred.user,
            password: cred.password,
            database: cred.database,
        });
        try {
            console.log(`Testing: ${cred.user}:${cred.password}@localhost:5432/${cred.database}`);
            await client.connect();
            console.log('✅ SUCCESS!');
            const res = await client.query('SELECT current_database(), current_user');
            console.log('Result:', res.rows[0]);
            await client.end();
            return;
        } catch (err) {
            console.log(`❌ FAILED: ${err.message}`);
        }
    }
    console.log('All tests failed.');
}

testConnections();
