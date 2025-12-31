/**
 * Script to create a test user for development
 * Run with: npx tsx scripts/seed-test-user.ts
 */

import pg from 'pg';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

async function seedTestUser() {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		// Create test company
		const companyId = randomUUID();
		const companyResult = await client.query(
			`INSERT INTO companies (id, name, slug, status, settings)
			 VALUES ($1, $2, $3, 'active', '{}')
			 ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
			 RETURNING id`,
			[companyId, 'Test Company', 'test-company']
		);
		const finalCompanyId = companyResult.rows[0].id;

		// Hash the password
		const passwordHash = await bcrypt.hash('test123', 12);

		// Create test user
		const userId = randomUUID();
		await client.query(
			`INSERT INTO users (id, company_id, email, password_hash, name, role, status, email_verified, settings)
			 VALUES ($1, $2, $3, $4, $5, 'admin', 'active', true, '{}')
			 ON CONFLICT (email) DO UPDATE SET
			   password_hash = EXCLUDED.password_hash,
			   name = EXCLUDED.name,
			   updated_at = NOW()`,
			[userId, finalCompanyId, 'test@example.com', passwordHash, 'Test User']
		);

		await client.query('COMMIT');

		console.log('Test user created successfully!');
		console.log('');
		console.log('Login credentials:');
		console.log('  Email: test@example.com');
		console.log('  Password: test123');
		console.log('');

	} catch (error) {
		await client.query('ROLLBACK');
		console.error('Error creating test user:', error);
		throw error;
	} finally {
		client.release();
		await pool.end();
	}
}

seedTestUser();
