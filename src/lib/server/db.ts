import pg from 'pg';
import { DATABASE_URL } from '$env/static/private';

const { Pool } = pg;

// Create a connection pool
const pool = new Pool({
	connectionString: DATABASE_URL,
	max: 10,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 2000
});

// Test connection on startup
pool.on('error', (err) => {
	console.error('Unexpected error on idle client', err);
});

export interface User {
	id: string;
	company_id: string;
	email: string;
	password_hash: string;
	name: string | null;
	role: string;
	avatar_url: string | null;
	email_verified: boolean;
	status: string;
	settings: Record<string, unknown>;
	created_at: Date;
	updated_at: Date;
}

export interface Company {
	id: string;
	name: string;
	slug: string;
	domain: string | null;
	status: string;
	settings: Record<string, unknown>;
}

export interface Session {
	id: string;
	session_token: string;
	user_id: string;
	expires_at: Date;
}

// User queries
export async function getUserByEmail(email: string): Promise<(User & { company_name: string }) | null> {
	const result = await pool.query<User & { company_name: string }>(
		`SELECT u.*, c.name as company_name
		 FROM users u
		 JOIN companies c ON u.company_id = c.id
		 WHERE u.email = $1 AND u.status = 'active'`,
		[email]
	);
	return result.rows[0] || null;
}

export async function getUserById(id: string): Promise<(User & { company_name: string }) | null> {
	const result = await pool.query<User & { company_name: string }>(
		`SELECT u.*, c.name as company_name
		 FROM users u
		 JOIN companies c ON u.company_id = c.id
		 WHERE u.id = $1`,
		[id]
	);
	return result.rows[0] || null;
}

export async function createUser(
	companyId: string,
	email: string,
	passwordHash: string,
	name: string | null
): Promise<User> {
	const result = await pool.query<User>(
		`INSERT INTO users (company_id, email, password_hash, name, role, status)
		 VALUES ($1, $2, $3, $4, 'viewer', 'active')
		 RETURNING *`,
		[companyId, email, passwordHash, name]
	);
	return result.rows[0];
}

export async function updateUserLastLogin(userId: string): Promise<void> {
	await pool.query(
		'UPDATE users SET last_login_at = NOW() WHERE id = $1',
		[userId]
	);
}

// Session queries
export async function createSession(userId: string, sessionToken: string, expiresAt: Date): Promise<Session> {
	const result = await pool.query<Session>(
		`INSERT INTO auth_sessions (user_id, session_token, expires_at)
		 VALUES ($1, $2, $3)
		 RETURNING *`,
		[userId, sessionToken, expiresAt]
	);
	return result.rows[0];
}

export async function getSessionByToken(token: string): Promise<(Session & User & { company_name: string }) | null> {
	const result = await pool.query<Session & User & { company_name: string }>(
		`SELECT s.*, u.email, u.name, u.role, u.company_id, u.avatar_url, u.status as user_status, c.name as company_name
		 FROM auth_sessions s
		 JOIN users u ON s.user_id = u.id
		 JOIN companies c ON u.company_id = c.id
		 WHERE s.session_token = $1 AND s.expires_at > NOW()`,
		[token]
	);
	return result.rows[0] || null;
}

export async function deleteSession(token: string): Promise<void> {
	await pool.query('DELETE FROM auth_sessions WHERE session_token = $1', [token]);
}

export async function deleteExpiredSessions(): Promise<void> {
	await pool.query('DELETE FROM auth_sessions WHERE expires_at < NOW()');
}

// Company queries
export async function getCompanyBySlug(slug: string): Promise<Company | null> {
	const result = await pool.query<Company>(
		'SELECT * FROM companies WHERE slug = $1 AND status = \'active\'',
		[slug]
	);
	return result.rows[0] || null;
}

export async function getCompanyById(id: string): Promise<Company | null> {
	const result = await pool.query<Company>(
		'SELECT * FROM companies WHERE id = $1',
		[id]
	);
	return result.rows[0] || null;
}

// Verification token queries
export async function createVerificationToken(
	identifier: string,
	token: string,
	expiresAt: Date
): Promise<void> {
	await pool.query(
		`INSERT INTO auth_verification_tokens (identifier, token, expires_at)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (identifier, token) DO UPDATE SET expires_at = $3`,
		[identifier, token, expiresAt]
	);
}

export async function getVerificationToken(
	identifier: string,
	token: string
): Promise<{ identifier: string; token: string; expires_at: Date } | null> {
	const result = await pool.query<{ identifier: string; token: string; expires_at: Date }>(
		'SELECT * FROM auth_verification_tokens WHERE identifier = $1 AND token = $2',
		[identifier, token]
	);
	return result.rows[0] || null;
}

export async function deleteVerificationToken(identifier: string, token: string): Promise<void> {
	await pool.query(
		'DELETE FROM auth_verification_tokens WHERE identifier = $1 AND token = $2',
		[identifier, token]
	);
}

// Password reset queries
export async function createPasswordResetToken(
	userId: string,
	tokenHash: string,
	expiresAt: Date
): Promise<void> {
	await pool.query(
		`INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
		 VALUES ($1, $2, $3)`,
		[userId, tokenHash, expiresAt]
	);
}

export async function getPasswordResetToken(
	tokenHash: string
): Promise<{ id: string; user_id: string; expires_at: Date; used_at: Date | null } | null> {
	const result = await pool.query<{ id: string; user_id: string; expires_at: Date; used_at: Date | null }>(
		'SELECT * FROM password_reset_tokens WHERE token_hash = $1 AND expires_at > NOW() AND used_at IS NULL',
		[tokenHash]
	);
	return result.rows[0] || null;
}

export async function markPasswordResetTokenUsed(id: string): Promise<void> {
	await pool.query(
		'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
		[id]
	);
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
	await pool.query(
		'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $1',
		[passwordHash, userId]
	);
}

export { pool };
