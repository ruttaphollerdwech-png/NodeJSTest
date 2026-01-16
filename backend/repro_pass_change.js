const http = require('http');

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function run() {
    console.log('--- Step 1: Login ---');
    const loginData = JSON.stringify({ username: 'admin', password: 'admin123' });
    const loginRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(loginData)
        }
    }, loginData);

    console.log('Login Status:', loginRes.statusCode);
    const cookie = loginRes.headers['set-cookie']?.[0];
    if (!cookie) {
        console.error('No cookie received. Body:', loginRes.body);
        return;
    }
    console.log('Logged in.');

    console.log('\n--- Step 2: Get Admin ID ---');
    const usersRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/admin/users',
        method: 'GET',
        headers: { 'Cookie': cookie }
    });

    if (usersRes.statusCode !== 200) {
        console.error('Failed to get users:', usersRes.statusCode, usersRes.body);
        return;
    }

    const users = JSON.parse(usersRes.body);
    const adminUser = users.find(u => u.username === 'admin');
    if (!adminUser) {
        console.error('Admin user not found');
        return;
    }
    console.log('Admin ID:', adminUser.id);

    console.log('\n--- Step 3: Change Password ---');
    const pwData = JSON.stringify({ password: 'admin123' });
    const pwRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: `/api/admin/users/${adminUser.id}/password`,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(pwData),
            'Cookie': cookie
        }
    }, pwData);

    console.log('Change Password Status:', pwRes.statusCode);
    console.log('Change Password Body:', pwRes.body);
}

run().catch(err => console.error('Script Error:', err));
