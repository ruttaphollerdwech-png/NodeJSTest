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
    // 1. Login
    const loginData = JSON.stringify({ username: 'admin', password: 'admin123' }); // Assuming password was changed to admin123 in previous task, or use default if failed. 
    // Wait, in previous task I changed it to 'admin123'.

    let cookie;

    // Try login
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

    if (loginRes.statusCode === 200) {
        cookie = loginRes.headers['set-cookie']?.[0];
        console.log('Login successful.');
    } else {
        console.error('Login failed:', loginRes.statusCode, loginRes.body);
        // Try default password just in case (if previous task didn't persist db change? db is persistent though)
        // actually looking at the previous task, I changed it to admin123. 
        return;
    }

    // 2. Fetch Dashboard
    const dashRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/dashboard',
        method: 'GET',
        headers: { 'Cookie': cookie }
    });

    console.log('Dashboard Status:', dashRes.statusCode);
    console.log('Dashboard Body:', dashRes.body);
}

run().catch(err => console.error(err));
