const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL Pool
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'task_db',
    password: 'Pass1234',
    port: 5432,
});

// Test DB Connection
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Initialize Database
const initDB = async () => {
    try {
        console.log('Connecting to PostgreSQL...');
        const client = await pool.connect();
        console.log('Connected to PostgreSQL successfully.');

        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(100) NOT NULL,
                email VARCHAR(100),
                full_name VARCHAR(100),
                role VARCHAR(20) DEFAULT 'user'
            );
            
            -- Add columns if they don't exist (for existing databases)
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='users' AND COLUMN_NAME='email') THEN
                    ALTER TABLE users ADD COLUMN email VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='users' AND COLUMN_NAME='full_name') THEN
                    ALTER TABLE users ADD COLUMN full_name VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='users' AND COLUMN_NAME='role') THEN
                    ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
                END IF;
            END $$;

            -- Migration: Rename 'transport' role to 'driver'
            UPDATE users SET role = 'driver' WHERE role = 'transport';

            CREATE TABLE IF NOT EXISTS shipments (
                id SERIAL PRIMARY KEY,
                cargo_name VARCHAR(100) NOT NULL,
                origin VARCHAR(200) NOT NULL,
                destination VARCHAR(200) NOT NULL,
                weight DECIMAL,
                status VARCHAR(50) DEFAULT 'Pending',
                user_id INTEGER REFERENCES users(id),
                driver_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                /* New Fields */
                origin_lat DECIMAL,
                origin_lng DECIMAL,
                dest_lat DECIMAL,
                dest_lng DECIMAL,
                description TEXT,
                pallet_qty INTEGER DEFAULT 0,
                box_qty INTEGER DEFAULT 0,
                total_volume DECIMAL,
                consignee_name VARCHAR(100),
                consignee_phone VARCHAR(50),
                consignee_address TEXT,
                delivery_remark TEXT,
                cargo_items JSONB
            );

            -- Ensure new columns exist (Migration)
            DO $$ 
            BEGIN 
                -- Add Location
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='shipments' AND COLUMN_NAME='origin_lat') THEN
                    ALTER TABLE shipments ADD COLUMN origin_lat DECIMAL;
                    ALTER TABLE shipments ADD COLUMN origin_lng DECIMAL;
                    ALTER TABLE shipments ADD COLUMN dest_lat DECIMAL;
                    ALTER TABLE shipments ADD COLUMN dest_lng DECIMAL;
                END IF;
                -- Add Info
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='shipments' AND COLUMN_NAME='description') THEN
                    ALTER TABLE shipments ADD COLUMN description TEXT;
                END IF;
                -- Add Aggregates
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='shipments' AND COLUMN_NAME='pallet_qty') THEN
                    ALTER TABLE shipments ADD COLUMN pallet_qty INTEGER DEFAULT 0;
                    ALTER TABLE shipments ADD COLUMN box_qty INTEGER DEFAULT 0;
                    ALTER TABLE shipments ADD COLUMN total_volume DECIMAL;
                END IF;
                -- Add Consignee
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='shipments' AND COLUMN_NAME='consignee_name') THEN
                    ALTER TABLE shipments ADD COLUMN consignee_name VARCHAR(100);
                    ALTER TABLE shipments ADD COLUMN consignee_phone VARCHAR(50);
                    ALTER TABLE shipments ADD COLUMN consignee_address TEXT;
                    ALTER TABLE shipments ADD COLUMN delivery_remark TEXT;
                END IF;
                 -- Add JSONB Items
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='shipments' AND COLUMN_NAME='cargo_items') THEN
                    ALTER TABLE shipments ADD COLUMN cargo_items JSONB;
                END IF;

                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='shipments' AND COLUMN_NAME='driver_id') THEN
                    ALTER TABLE shipments ADD COLUMN driver_id INTEGER REFERENCES users(id);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='shipments' AND COLUMN_NAME='truck_id') THEN
                    ALTER TABLE shipments ADD COLUMN truck_id INTEGER REFERENCES trucks(id);
                END IF;
                -- Add Schedule
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='shipments' AND COLUMN_NAME='pickup_time') THEN
                    ALTER TABLE shipments ADD COLUMN pickup_time TIMESTAMP;
                    ALTER TABLE shipments ADD COLUMN delivery_time TIMESTAMP;
                END IF;
                -- Soft Delete
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='shipments' AND COLUMN_NAME='is_deleted') THEN
                    ALTER TABLE shipments ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
                END IF;
                -- Add POD fields
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='shipments' AND COLUMN_NAME='pod_signature') THEN
                    ALTER TABLE shipments ADD COLUMN pod_signature TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='shipments' AND COLUMN_NAME='pod_image') THEN
                    ALTER TABLE shipments ADD COLUMN pod_image TEXT;
                END IF;
            END $$;

            -- Truck Module Table
            CREATE TABLE IF NOT EXISTS trucks (
                id SERIAL PRIMARY KEY,
                license_plate VARCHAR(20) UNIQUE NOT NULL,
                model VARCHAR(50),
                capacity DECIMAL,
                status VARCHAR(50) DEFAULT 'Available',
                driver_id INTEGER REFERENCES users(id),
                truck_type VARCHAR(50),
                fuel_type VARCHAR(30),
                year INTEGER,
                vin VARCHAR(50),
                registration_expiry DATE,
                insurance_expiry DATE,
                mileage INTEGER DEFAULT 0,
                notes TEXT,
                container_size VARCHAR(30)
            );

            -- Migration: Add new truck columns if they don't exist
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='trucks' AND COLUMN_NAME='truck_type') THEN
                    ALTER TABLE trucks ADD COLUMN truck_type VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='trucks' AND COLUMN_NAME='fuel_type') THEN
                    ALTER TABLE trucks ADD COLUMN fuel_type VARCHAR(30);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='trucks' AND COLUMN_NAME='year') THEN
                    ALTER TABLE trucks ADD COLUMN year INTEGER;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='trucks' AND COLUMN_NAME='vin') THEN
                    ALTER TABLE trucks ADD COLUMN vin VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='trucks' AND COLUMN_NAME='registration_expiry') THEN
                    ALTER TABLE trucks ADD COLUMN registration_expiry DATE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='trucks' AND COLUMN_NAME='insurance_expiry') THEN
                    ALTER TABLE trucks ADD COLUMN insurance_expiry DATE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='trucks' AND COLUMN_NAME='mileage') THEN
                    ALTER TABLE trucks ADD COLUMN mileage INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='trucks' AND COLUMN_NAME='notes') THEN
                    ALTER TABLE trucks ADD COLUMN notes TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='trucks' AND COLUMN_NAME='container_size') THEN
                    ALTER TABLE trucks ADD COLUMN container_size VARCHAR(30);
                END IF;
            END $$;
        `);



        // Create a default user if not exists
        const userCheck = await client.query('SELECT * FROM users WHERE username = $1', ['admin']);
        if (userCheck.rows.length === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await client.query('INSERT INTO users (username, password, full_name, email, role) VALUES ($1, $2, $3, $4, $5)',
                ['admin', hashedPassword, 'Administrator', 'admin@example.com', 'admin']);
            console.log('Default user "admin" created with profile.');
        } else {
            // Ensure admin user has admin role
            await client.query('UPDATE users SET role = $1 WHERE username = $2', ['admin', 'admin']);
        }
        client.release();
        return true;
    } catch (err) {
        console.error('DATABASE CONNECTION ERROR:', err.message);
        console.error('Please ensure PostgreSQL is running and "task_db" exists.');
        return false;
    }
};

// Middleware
app.use(express.static(path.join(__dirname, '..', 'frontend')));
// Increase JSON limit for image uploads
app.use(express.json({ limit: '50mb' }));
app.use(session({
    secret: 'secret-key-12345',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Auth Middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) return next();
    res.status(401).json({ message: 'Unauthorized' });
};

const isAdmin = (req, res, next) => {
    if (req.session.userId && req.session.role === 'admin') return next();
    res.status(403).json({ message: 'Forbidden: Admin access only' });
};

// API Endpoints
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`Login attempt: ${username}`);
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.role = user.role;
            console.log(`Login success: ${username} (Role: ${user.role})`);
            res.json({ message: 'OK' });
        } else {
            console.log(`Login failed: ${username}`);
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/auth/status', (req, res) => {
    if (req.session.userId) {
        res.json({ authenticated: true, username: req.session.username, role: req.session.role });
    } else {
        res.json({ authenticated: false });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out' });
});

// Shipments API
app.get('/api/shipments', isAuthenticated, async (req, res) => {
    try {
        let whereClauses = [];
        let params = [];
        let paramIndex = 1;

        if (req.session.role === 'driver') {
            whereClauses.push(`t.driver_id = $${paramIndex++}`);
            params.push(req.session.userId);
        }

        // Exclude deleted (Soft Delete)
        whereClauses.push(`s.is_deleted = FALSE`);

        const whereSection = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const sql = `
            SELECT s.*, 
                   COALESCE(u.full_name, u.username) as owner_name, 
                   COALESCE(d.full_name, d.username) as driver_name,
                   t.license_plate as truck_plate
            FROM shipments s 
            JOIN users u ON s.user_id = u.id
            LEFT JOIN trucks t ON s.truck_id = t.id
            LEFT JOIN users d ON t.driver_id = d.id
            ${whereSection}
            ORDER BY s.created_at DESC
        `;

        const result = await pool.query(sql, params);
        res.json(result.rows);
    } catch (err) {
        console.error(`[GET_SHIPMENTS_ERROR]`, err.message);
        res.status(500).json({ error: 'Failed to fetch shipments' });
    }
});




app.post('/api/shipments', isAuthenticated, async (req, res) => {
    if (req.session.role === 'driver') {
        return res.status(403).json({ message: 'Driver role cannot create shipments' });
    }
    const {
        cargo_name, origin, destination, weight,
        origin_lat, origin_lng, dest_lat, dest_lng,
        description, pallet_qty, box_qty, total_volume,
        consignee_name, consignee_phone, consignee_address, delivery_remark,
        cargo_items, pickup_time, delivery_time
    } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO shipments (
                cargo_name, origin, destination, weight, user_id,
                origin_lat, origin_lng, dest_lat, dest_lng,
                description, pallet_qty, box_qty, total_volume,
                consignee_name, consignee_phone, consignee_address, delivery_remark,
                cargo_items, pickup_time, delivery_time
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) RETURNING *`,
            [
                cargo_name, origin, destination, weight, req.session.userId,
                origin_lat || null, origin_lng || null, dest_lat || null, dest_lng || null,
                description || '', pallet_qty || 0, box_qty || 0, total_volume || 0,
                consignee_name || '', consignee_phone || '', consignee_address || '', delivery_remark || '',
                JSON.stringify(cargo_items || []), pickup_time || null, delivery_time || null
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Edit Shipment Details Endpoint
app.put('/api/shipments/:id', isAuthenticated, async (req, res) => {
    const shipmentId = req.params.id;
    const {
        cargo_name, origin, destination, weight,
        origin_lat, origin_lng, dest_lat, dest_lng,
        description, pallet_qty, box_qty, total_volume,
        consignee_name, consignee_phone, consignee_address, delivery_remark,
        cargo_items, pickup_time, delivery_time
    } = req.body;

    if (req.session.role === 'driver') {
        return res.status(403).json({ message: 'Drivers cannot edit shipments' });
    }

    try {
        // Check current status
        const check = await pool.query('SELECT status FROM shipments WHERE id = $1', [shipmentId]);
        if (check.rows.length === 0) return res.status(404).json({ message: 'Shipment not found' });

        const currentStatus = check.rows[0].status;
        if (currentStatus !== 'Pending' && currentStatus !== 'Assigned') {
            return res.status(400).json({ message: 'Cannot edit shipment that has started (In Transit or Delivered)' });
        }

        const result = await pool.query(
            `UPDATE shipments SET 
                cargo_name=$1, origin=$2, destination=$3, weight=$4,
                origin_lat=$5, origin_lng=$6, dest_lat=$7, dest_lng=$8,
                description=$9, pallet_qty=$10, box_qty=$11, total_volume=$12,
                consignee_name=$13, consignee_phone=$14, consignee_address=$15, delivery_remark=$16,
                cargo_items=$17, pickup_time=$18, delivery_time=$19
             WHERE id=$20 RETURNING *`,
            [
                cargo_name, origin, destination, weight,
                origin_lat || null, origin_lng || null, dest_lat || null, dest_lng || null,
                description || '', pallet_qty || 0, box_qty || 0, total_volume || 0,
                consignee_name || '', consignee_phone || '', consignee_address || '', delivery_remark || '',
                JSON.stringify(cargo_items || []), pickup_time || null, delivery_time || null,
                shipmentId
            ]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/shipments/:id/status', isAuthenticated, async (req, res) => {
    const { status, pod_signature, pod_image } = req.body;
    const shipmentId = req.params.id;
    try {
        // Fetch shipment and joined truck details to verify driver ownership
        const checkSql = `
            SELECT s.*, t.driver_id as truck_driver_id 
            FROM shipments s 
            LEFT JOIN trucks t ON s.truck_id = t.id 
            WHERE s.id = $1
        `;
        const checkResult = await pool.query(checkSql, [shipmentId]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Shipment not found' });
        }

        const shipment = checkResult.rows[0];

        // Authorization check
        if (req.session.role === 'driver') {
            // Driver can only update if they are the driver of the assigned truck
            if (shipment.truck_driver_id !== req.session.userId) {
                return res.status(403).json({ message: 'Unauthorized: This shipment is not assigned to your truck' });
            }
        }
        // Admin and User roles can update any shipment status (implicit permission)

        let updateSql = 'UPDATE shipments SET status = $1';
        let params = [status];
        let paramIndex = 2;

        if (status === 'Delivered') {
            updateSql += `, delivery_time = NOW()`;

            if (pod_signature) {
                updateSql += `, pod_signature = $${paramIndex++}`;
                params.push(pod_signature);
            }
            if (pod_image) {
                updateSql += `, pod_image = $${paramIndex++}`;
                params.push(pod_image);
            }
        }

        updateSql += ` WHERE id = $${paramIndex} RETURNING *`;
        params.push(shipmentId);

        const updateResult = await pool.query(updateSql, params);
        res.json(updateResult.rows[0]);
    } catch (err) {
        console.error('[STATUS_UPDATE_ERROR]', err.message);
        res.status(500).json({ error: err.message });
    }
});


// Soft Delete Shipment
app.delete('/api/shipments/:id', isAuthenticated, async (req, res) => {
    const shipmentId = req.params.id;

    if (req.session.role === 'driver') {
        return res.status(403).json({ message: 'Drivers cannot delete shipments' });
    }

    try {
        // Check current status
        const check = await pool.query('SELECT status FROM shipments WHERE id = $1', [shipmentId]);
        if (check.rows.length === 0) return res.status(404).json({ message: 'Shipment not found' });

        // Optional: Block delete if In Transit already? User request says "data will stamp as delete flag", implied cancellation.
        // Usually cancellation is only possible before transit.
        const currentStatus = check.rows[0].status;
        if (currentStatus !== 'Pending' && currentStatus !== 'Assigned') {
            return res.status(400).json({ message: 'Cannot cancel shipment that has started.' });
        }

        const result = await pool.query(
            'UPDATE shipments SET is_deleted = TRUE WHERE id = $1 RETURNING id',
            [shipmentId]
        );
        res.json({ message: 'Shipment cancelled', id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/shipments/:id/assign', isAuthenticated, async (req, res) => {
    const { truck_id } = req.body;
    const shipmentId = parseInt(req.params.id);
    const truckIdInt = (truck_id && truck_id !== "") ? parseInt(truck_id) : null;

    console.log(`[SHIPMENT_ASSIGN] By User: ${req.session.userId} (${req.session.role}), Shipment: ${shipmentId}, Truck: ${truckIdInt}`);

    try {
        let sql = 'UPDATE shipments SET truck_id = $1, status = CASE WHEN $1::INTEGER IS NOT NULL THEN \'Assigned\' ELSE \'Pending\' END WHERE id = $2';
        let params = [truckIdInt, shipmentId];

        // Only restrict update by user_id if they are NOT an admin or a regular user (though only these roles should reach here)
        if (req.session.role !== 'admin' && req.session.role !== 'user') {
            sql += ' AND user_id = $3';
            params.push(req.session.userId);
        }

        const result = await pool.query(sql + ' RETURNING *', params);

        if (result.rows.length === 0) {
            console.warn(`[SHIPMENT_ASSIGN_FAILED] No rows updated. Shipment ID: ${shipmentId}, User: ${req.session.userId}`);
            return res.status(404).json({ message: 'Shipment not found or unauthorized' });
        }

        console.log(`[SHIPMENT_ASSIGN_SUCCESS] Shipment ${shipmentId} assigned to Truck ${truckIdInt}`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(`[SHIPMENT_ASSIGN_ERROR] SQL Error:`, err.message);
        res.status(500).json({ error: 'Database error during assignment' });
    }
});


app.get('/api/drivers', isAuthenticated, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, full_name FROM users WHERE role = \'driver\' ORDER BY username ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});




// Profile API
app.get('/api/user/profile', isAuthenticated, async (req, res) => {
    try {
        const result = await pool.query('SELECT username, email, full_name, role FROM users WHERE id = $1', [req.session.userId]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.put('/api/user/profile', isAuthenticated, async (req, res) => {
    if (req.session.role === 'driver') {
        return res.status(403).json({ message: 'Driver role cannot edit profile' });
    }
    const { email, full_name } = req.body;
    try {
        await pool.query(
            'UPDATE users SET email = $1, full_name = $2 WHERE id = $3',
            [email, full_name, req.session.userId]
        );
        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Truck API
app.get('/api/trucks', isAuthenticated, async (req, res) => {
    try {
        const sql = `
            SELECT t.*, 
                   COALESCE(d.full_name, d.username) as driver_name 
            FROM trucks t 
            LEFT JOIN users d ON t.driver_id = d.id
            ORDER BY t.id ASC
        `;
        const result = await pool.query(sql);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/trucks', isAdmin, async (req, res) => {
    const { license_plate, model, capacity, driver_id, truck_type, fuel_type, year, vin, registration_expiry, insurance_expiry, mileage, notes, container_size } = req.body;
    const driverIdInt = (driver_id && driver_id !== "") ? parseInt(driver_id) : null;
    try {
        const result = await pool.query(
            `INSERT INTO trucks (license_plate, model, capacity, driver_id, status, truck_type, fuel_type, year, vin, registration_expiry, insurance_expiry, mileage, notes, container_size) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
            [license_plate, model, capacity, driverIdInt, driverIdInt ? 'In Use' : 'Available',
                truck_type || null, fuel_type || null, year || null, vin || null,
                registration_expiry || null, insurance_expiry || null, mileage || 0, notes || null, container_size || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ message: 'License plate already exists' });
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/trucks/:id', isAdmin, async (req, res) => {
    const { license_plate, model, capacity, driver_id, truck_type, fuel_type, year, vin, registration_expiry, insurance_expiry, mileage, notes, container_size } = req.body;
    const { id } = req.params;
    const driverIdInt = (driver_id && driver_id !== "") ? parseInt(driver_id) : null;
    try {
        const result = await pool.query(
            `UPDATE trucks SET 
                license_plate = $1, model = $2, capacity = $3, driver_id = $4, 
                status = CASE WHEN $4::INTEGER IS NOT NULL THEN 'In Use' ELSE 'Available' END,
                truck_type = $5, fuel_type = $6, year = $7, vin = $8,
                registration_expiry = $9, insurance_expiry = $10, mileage = $11, notes = $12, container_size = $13
             WHERE id = $14 RETURNING *`,
            [license_plate, model, capacity, driverIdInt,
                truck_type || null, fuel_type || null, year || null, vin || null,
                registration_expiry || null, insurance_expiry || null, mileage || 0, notes || null, container_size || null, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Truck not found' });
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ message: 'License plate already exists' });
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/trucks/:id/assign', isAdmin, async (req, res) => {
    const { driver_id } = req.body;
    const truckId = parseInt(req.params.id);
    const driverIdInt = (driver_id && driver_id !== "") ? parseInt(driver_id) : null;

    console.log(`[TRUCK_ASSIGN] Truck: ${truckId}, Driver: ${driverIdInt} (Raw: ${driver_id})`);

    try {
        // If assigning, check if driver exists and is a driver
        if (driverIdInt) {
            const driverCheck = await pool.query("SELECT * FROM users WHERE id = $1 AND role = 'driver'", [driverIdInt]);
            if (driverCheck.rows.length === 0) {
                console.warn(`[TRUCK_ASSIGN] Invalid driver: ${driverIdInt}`);
                return res.status(400).json({ message: 'Invalid driver selected: User is not a driver or does not exist' });
            }
        }

        const result = await pool.query(
            'UPDATE trucks SET driver_id = $1, status = CASE WHEN $1::INTEGER IS NOT NULL THEN \'In Use\' ELSE \'Available\' END WHERE id = $2 RETURNING *',
            [driverIdInt, truckId]
        );

        if (result.rows.length === 0) {
            console.warn(`[TRUCK_ASSIGN] Truck not found: ${truckId}`);
            return res.status(404).json({ message: 'Truck not found' });
        }
        console.log(`[TRUCK_ASSIGN] Success: Truck ${truckId} -> Driver ${driverIdInt}`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(`[TRUCK_ASSIGN] Error:`, err);
        res.status(500).json({ error: err.message });
    }
});

// Admin API
app.get('/api/admin/users', isAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, email, full_name, role FROM users ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// This endpoint is now redundant but kept for admin compatibility
app.get('/api/admin/drivers', isAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, full_name FROM users WHERE role = \'driver\' ORDER BY username ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.post('/api/admin/users', isAdmin, async (req, res) => {
    const { username, password, email, full_name, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (username, password, email, full_name, role) VALUES ($1, $2, $3, $4, $5)',
            [username, hashedPassword, email, full_name, role || 'user']
        );
        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ message: 'Username already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/users/:id', isAdmin, async (req, res) => {
    const { email, full_name, role } = req.body;
    try {
        await pool.query(
            'UPDATE users SET email = $1, full_name = $2, role = $3 WHERE id = $4',
            [email, full_name, role, req.params.id]
        );
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/users/:id/password', isAdmin, async (req, res) => {
    const { password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.params.id]);
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});




// Dashboard Stats API
app.get('/api/dashboard', isAuthenticated, async (req, res) => {
    // Restrict access
    if (req.session.role === 'driver') {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        // Run aggregations in parallel
        // 1. Shipment Status Stats (Last 30 Days)
        const shipmentsQuery = pool.query(
            "SELECT status, COUNT(*) as count, SUM(total_volume) as vol, SUM(weight) as wgt FROM shipments WHERE is_deleted = FALSE AND created_at >= NOW() - INTERVAL '30 DAYS' GROUP BY status"
        );

        // 2. Truck Stats (Current Snapshot - no time limit)
        const trucksQuery = pool.query(
            "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'In Use' THEN 1 ELSE 0 END) as active FROM trucks"
        );

        // 3. Timeline Stats (Last 30 Days grouped by day)
        const timelineQuery = pool.query(`
            SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as day, COUNT(*) as count 
            FROM shipments 
            WHERE is_deleted = FALSE AND created_at >= NOW() - INTERVAL '30 DAYS'
            GROUP BY day 
            ORDER BY day ASC
        `);

        const results = await Promise.all([shipmentsQuery, trucksQuery, timelineQuery]);

        const shipmentStats = results[0].rows;
        const truckStats = results[1].rows[0];
        const timelineStats = results[2].rows;

        // Format shipment data
        const stats = {
            total_shipments: 0,
            total_volume: 0,
            total_weight: 0,
            pending: 0,
            assigned: 0,
            in_transit: 0,
            delivered: 0,
            total_trucks: parseInt(truckStats.total || 0),
            active_trucks: parseInt(truckStats.active || 0),
            timeline: timelineStats // Add timeline data to response
        };

        shipmentStats.forEach(row => {
            const count = parseInt(row.count);
            const vol = parseFloat(row.vol || 0);
            const wgt = parseFloat(row.wgt || 0);

            stats.total_shipments += count;
            stats.total_volume += vol;
            stats.total_weight += wgt;

            const statusKey = row.status.toLowerCase().replace(' ', '_');
            if (stats.hasOwnProperty(statusKey)) {
                stats[statusKey] = count;
            }
        });

        // Round totals
        stats.total_volume = parseFloat(stats.total_volume.toFixed(3));
        stats.total_weight = parseFloat(stats.total_weight.toFixed(2));

        res.json(stats);
    } catch (err) {
        console.error('[DASHBOARD_ERROR]', err);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Start Server
const start = async () => {
    const dbReady = await initDB();
    if (dbReady) {
        app.listen(PORT, () => {
            console.log(`>>> Server is ACTIVE on http://localhost:${PORT}`);
        });
    } else {
        console.error('Failed to start server due to DB issues.');
        process.exit(1);
    }
};

start();

process.on('uncaughtException', (err) => console.error('CRASH:', err));
process.on('unhandledRejection', (err) => console.error('REJECTION:', err));



