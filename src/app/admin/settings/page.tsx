"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock, User, Shield, CheckCircle, AlertCircle } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Change password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/admin/auth/me');
        if (res.ok) {
          const data = await res.json();
          setAdmin(data.admin);
        } else {
          router.push('/admin/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/admin/login');
      }
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validate
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch('/api/admin/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to change password. Please try again.' });
    }

    setPasswordLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080706] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D26A] mx-auto mb-4"></div>
          <p className="text-[#7A7068]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080706] text-white">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#080706]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-[#7A7068] hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold">Admin Settings</h1>
          </div>
        </div>
      </header>

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-8">
        
        {/* Profile Info */}
        <div className="bg-[#0F0D0B] border border-white/[0.07] rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center">
              <User size={24} className="text-[#00D26A]" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{admin?.name || admin?.email}</h2>
              <p className="text-sm text-[#7A7068]">{admin?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.05]">
            <div>
              <p className="text-xs text-[#7A7068] mb-1">Role</p>
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-[#00D26A]" />
                <span className="text-sm font-medium capitalize">{admin?.role}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-[#7A7068] mb-1">Account ID</p>
              <span className="text-sm font-mono">{admin?.id.slice(0, 12)}...</span>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-[#0F0D0B] border border-white/[0.07] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Lock size={20} className="text-[#00D26A]" />
            <h2 className="text-lg font-bold">Change Password</h2>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success' 
                ? 'bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A]' 
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
              <span className="text-sm">{message.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label htmlFor="current" className="block text-sm font-medium text-white mb-2">
                Current Password
              </label>
              <input
                id="current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#080706] border border-white/[0.1] rounded-lg text-white placeholder:text-[#7A7068] focus:outline-none focus:border-[#00D26A]/50 transition-colors"
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label htmlFor="new" className="block text-sm font-medium text-white mb-2">
                New Password
              </label>
              <input
                id="new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 bg-[#080706] border border-white/[0.1] rounded-lg text-white placeholder:text-[#7A7068] focus:outline-none focus:border-[#00D26A]/50 transition-colors"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-white mb-2">
                Confirm New Password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 bg-[#080706] border border-white/[0.1] rounded-lg text-white placeholder:text-[#7A7068] focus:outline-none focus:border-[#00D26A]/50 transition-colors"
                placeholder="Re-enter new password"
              />
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full py-3 bg-[#00D26A] text-black font-bold rounded-lg hover:bg-[#00D26A]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passwordLoading ? 'Changing Password...' : 'Change Password'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-white/[0.02] border border-white/[0.05] rounded-lg">
            <p className="text-xs text-[#7A7068] leading-relaxed">
              <strong className="text-white">Security Note:</strong> Changing your password will log you out from all other devices. 
              You&apos;ll need to log in again with your new password.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
