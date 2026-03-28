import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../config';
import type { AuthState } from '../types';

interface ProfileProps {
  auth: AuthState | null;
  onUpdateAuth: (auth: AuthState | null) => void;
  showErrorModal?: (message: string) => void;
  showSuccessModal?: (message: string) => void;
}

interface UserProfile {
  id: number;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
}

export const Profile: React.FC<ProfileProps> = ({ auth, onUpdateAuth, showErrorModal, showSuccessModal }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (auth) {
      loadProfile();
    }
  }, [auth]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const loadProfile = async () => {
    if (!auth) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl('auth/profile'), {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to load profile');
        return;
      }

      const data = await res.json();
      setProfile(data);
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setError('Unable to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!auth) return;

    if (!email && !phone) {
      setError('Email or phone number is required');
      return;
    }

    setUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(getApiUrl('auth/profile'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          full_name: fullName.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update profile');
        return;
      }

      setProfile(data);
      setEditMode(false);
      setSuccess('✅ Profile updated successfully!');

      // Update auth state with new user info
      if (onUpdateAuth) {
        onUpdateAuth({
          ...auth,
          user: {
            ...auth.user,
            email: data.email,
            phone: data.phone,
          },
        });
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setError('Unable to update profile. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (!auth) return;

    if (!currentPassword || !newPassword) {
      const errorMsg = 'Current password and new password are required';
      if (showErrorModal) {
        showErrorModal(errorMsg);
      } else {
        setError(errorMsg);
      }
      return;
    }

    if (newPassword !== confirmPassword) {
      const errorMsg = 'New passwords do not match';
      if (showErrorModal) {
        showErrorModal(errorMsg);
      } else {
        setError(errorMsg);
      }
      return;
    }

    setUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(getApiUrl('auth/change-password'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.error || 'Failed to change password';
        if (showErrorModal) {
          showErrorModal(errorMsg);
        } else {
          setError(errorMsg);
        }
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      const successMsg = '✅ Password changed successfully!';
      if (showSuccessModal) {
        showSuccessModal(successMsg);
      } else {
        setSuccess(successMsg);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      console.error('Failed to change password:', err);
      const errorMsg = 'Unable to change password. Please try again.';
      if (showErrorModal) {
        showErrorModal(errorMsg);
      } else {
        setError(errorMsg);
      }
    } finally {
      setUpdating(false);
    }
  };

  if (!auth) {
    return (
      <div>
        <div className="warning-box">
          <div className="warning-box-content">
            <span className="warning-icon">⚠️</span>
            <p className="text-sm font-semibold warn-text">Login Required</p>
          </div>
          <p className="text-xs waring-para">
            Please login to view your profile.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center p-8">
        <p className="text-sm text-slate-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">My Profile</h2>
        <p className="section-subtitle">
          View and update your account information
        </p>
      </div>

      {error && (
        <div className="error-box mb-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="success-box-dark mb-4">
          <p className="text-sm text-green-400">{success}</p>
        </div>
      )}

      {profile && (
        <div className='profileView-cont'>
          <div className="space-y-6">
          {/* Profile Information */}
          <div className="card-dark">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-slate-50">Profile Information</h3>
              {!editMode && (
                <button
                  className="btn btn-yellow text-xs py-2 px-4"
                  onClick={() => setEditMode(true)}
                >
                  ✏️ Edit Profile
                </button>
              )}
            </div>

            {editMode ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white mb-1 block font-semibold">Full Name</label>
                  <input
                    type="text"
                    className="form-input-dark w-full py-2"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-white mb-1 block font-semibold">Email</label>
                  <input
                    type="email"
                    className="form-input-dark w-full py-2"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-white mb-1 block font-semibold">Phone Number</label>
                  <input
                    type="tel"
                    className="form-input-dark w-full py-2"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    className="btn btn-yellow flex-1"
                    onClick={handleUpdateProfile}
                    disabled={updating}
                  >
                    {updating ? 'Saving...' : '💾 Save Changes'}
                  </button>
                  <button
                    className="btn btn-secondary flex-1"
                    onClick={() => {
                      setEditMode(false);
                      setFullName(profile.full_name || '');
                      setEmail(profile.email || '');
                      setPhone(profile.phone || '');
                      setError(null);
                    }}
                    disabled={updating}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-white mb-1 font-semibold opacity-90">Full Name</p>
                  <p className="text-base text-white font-semibold">
                    {profile.full_name || 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white mb-1 font-semibold opacity-90">Email</p>
                  <p className="text-base text-white font-semibold">
                    {profile.email || 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white mb-1 font-semibold opacity-90">Phone Number</p>
                  <p className="text-base text-white font-semibold">
                    {profile.phone || 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white mb-1 font-semibold opacity-90">Account Type</p>
                  <p className="text-base text-white font-semibold">
                    {profile.is_admin ? '🛡️ Administrator' : '👤 Regular User'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white mb-1 font-semibold opacity-90">Member Since</p>
                  <p className="text-base text-white font-semibold">
                    {new Date(profile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Change Password */}
          <div className="card-dark">
            <h3 className="text-sm font-semibold text-slate-50 mb-4">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white mb-1 block font-semibold">Current Password</label>
                <input
                  type="password"
                  className="form-input-dark w-full py-2"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-white mb-1 block font-semibold">New Password</label>
                <input
                  type="password"
                  className="form-input-dark w-full py-2"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-white mb-1 block font-semibold">Confirm New Password</label>
                <input
                  type="password"
                  className="form-input-dark w-full py-2"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button
                className="btn btn-yellow w-full"
                onClick={handleChangePassword}
                disabled={updating || !currentPassword || !newPassword || !confirmPassword}
              >
                {updating ? 'Changing...' : '🔐 Change Password'}
              </button>
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  );
};
