import { query } from '../../_utils/db.js';
import { readAuth } from '../../_utils/jwt.js';
import bcrypt from 'bcryptjs';

async function requireAdmin(req, res) {
  const user = readAuth(req);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ ok: false, error: 'Forbidden' });
    return null;
  }
  return user;
}

function resolveId(req) {
  if (req.query?.id) return req.query.id;
  const url = req.url || '';
  const parts = url.split('?')[0].split('/');
  return parts[parts.length - 1];
}

export default async function handler(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const id = resolveId(req);
  if (!id) return res.status(400).json({ ok: false, error: 'Missing user id' });

  if (req.method === 'PATCH') {
    const body = req.body || {};
    const updates = [];
    const values = [];
    let i = 1;

    if (body.email) {
      updates.push(`email=$${i++}`);
      values.push(String(body.email).trim().toLowerCase());
    }
    if (body.role) {
      if (!['admin', 'editor', 'customer'].includes(body.role)) {
        return res.status(400).json({ ok: false, error: 'Invalid role' });
      }
      updates.push(`role=$${i++}`);
      values.push(body.role);
    }
    if (body.password) {
      const hash = await bcrypt.hash(String(body.password), 12);
      updates.push(`password_hash=$${i++}`);
      values.push(hash);
    }

    if (!updates.length) {
      return res.status(400).json({ ok: false, error: 'No fields to update' });
    }

    values.push(id);
    try {
      const result = await query(`update users set ${updates.join(', ')}, created_at = created_at where id=$${i} returning id, email, role, created_at`, values);
      if (!result.rowCount) return res.status(404).json({ ok: false, error: 'User not found' });
      return res.status(200).json({ ok: true, data: result.rows[0] });
    } catch (error) {
      if ((error.message || '').toLowerCase().includes('duplicate')) {
        return res.status(400).json({ ok: false, error: 'Email already exists' });
      }
      return res.status(500).json({ ok: false, error: 'Failed to update user' });
    }
  }

  if (req.method === 'DELETE') {
    if (id === admin.sub) {
      return res.status(400).json({ ok: false, error: 'You cannot delete yourself' });
    }
    try {
      const result = await query('delete from users where id=$1', [id]);
      if (!result.rowCount) return res.status(404).json({ ok: false, error: 'User not found' });
      return res.status(200).json({ ok: true, data: { deleted: true } });
    } catch (error) {
      return res.status(500).json({ ok: false, error: 'Failed to delete user' });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
