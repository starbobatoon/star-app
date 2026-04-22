'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Modal } from '@/components/ui/Modal';
import { colors, spacing, typography, radius } from '@/lib/design-tokens';

interface User {
  id: string;
  email: string;
  app_metadata: { role?: string };
  created_at: string;
  last_sign_in_at: string | null;
  user_metadata: object;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' });
  const [formError, setFormError] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch users');
      }
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create user');
      }
      setShowModal(false);
      setFormData({ email: '', password: '', confirmPassword: '' });
      setFormError('');
      fetchUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setAdding(false);
    }
  };

  const handleChangePassword = async (userId: string) => {
    const newPassword = prompt('Enter new password (min 6 chars):');
    if (!newPassword || newPassword.length < 6) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) throw new Error('Failed to update password');
      alert('Password updated successfully');
      fetchUsers();
    } catch (err) {
      alert('Failed to update password');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Delete this user? This is permanent.')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete user');
      fetchUsers();
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  return (
    <div style={{ padding: spacing.xl, maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
        <h1 style={{ ...typography.h1, color: colors.onSurface, margin: 0 }}>Admin Users</h1>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          Add Admin
        </Button>
      </div>

      {error && (
        <Card style={{ marginBottom: spacing.md, padding: spacing.lg, backgroundColor: `${colors.errorContainer}CC` }}>
          <p style={{ color: colors.onErrorContainer, margin: 0 }}>{error}</p>
        </Card>
      )}

      {loading ? (
        <Card style={{ padding: spacing.xl, textAlign: 'center' }}>
          <p style={{ color: colors.onSurfaceVariant }}>Loading users...</p>
        </Card>
      ) : (
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: `${spacing.md} 0`, textAlign: 'left', color: colors.onSurfaceVariant, borderBottom: `1px solid ${colors.outline}` }}>Email</th>
                  <th style={{ padding: `${spacing.md} 0`, textAlign: 'left', color: colors.onSurfaceVariant, borderBottom: `1px solid ${colors.outline}`, width: '120px' }}>Role</th>
                  <th style={{ padding: `${spacing.md} 0`, textAlign: 'left', color: colors.onSurfaceVariant, borderBottom: `1px solid ${colors.outline}`, width: '160px' }}>Created</th>
                  <th style={{ padding: `${spacing.md} 0`, textAlign: 'left', color: colors.onSurfaceVariant, borderBottom: `1px solid ${colors.outline}`, width: '160px' }}>Last Sign In</th>
                  <th style={{ padding: `${spacing.md} 0`, textAlign: 'left', color: colors.onSurfaceVariant, borderBottom: `1px solid ${colors.outline}`, width: '200px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: `1px solid ${colors.outlineVariant}` }}>
                    <td style={{ padding: `${spacing.md} 0`, color: colors.onSurface }}>{user.email}</td>
                    <td style={{ padding: `${spacing.md} 0` }}>
                      <Tag variant={user.app_metadata.role === 'admin' ? 'success' : 'default'}>{user.app_metadata.role || 'user'}</Tag>
                    </td>
                    <td style={{ padding: `${spacing.md} 0`, color: colors.onSurfaceVariant }}>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: `${spacing.md} 0`, color: colors.onSurfaceVariant }}>
                      {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td style={{ padding: `${spacing.md} 0`, display: 'flex', gap: spacing.sm }}>
                      <Button variant="secondary" onClick={() => handleChangePassword(user.id)}>
                        Reset PW
                      </Button>
                      <Button variant="tertiary" onClick={() => handleDelete(user.id)} style={{ color: colors.error }}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add New Admin">
        <form onSubmit={handleAddAdmin} style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
          />
          {formError && <p style={{ color: colors.error, margin: 0 }}>{formError}</p>}
          <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={adding}>
              {adding ? 'Creating...' : 'Create Admin'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
