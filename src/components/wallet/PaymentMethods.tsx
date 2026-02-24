import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../config';
import type { AuthState } from '../types';

interface PaymentMethod {
  id?: number;
  upi_id: string;
  qr_code: string;
  is_active: boolean;
}

interface PaymentMethodsProps {
  auth: AuthState | null;
}

export const PaymentMethods: React.FC<PaymentMethodsProps> = ({ auth }) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newUpiId, setNewUpiId] = useState('');
  const [newQrCode, setNewQrCode] = useState('');
  const [newQrFile, setNewQrFile] = useState<File | null>(null);
  const [newQrPreview, setNewQrPreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editUpiId, setEditUpiId] = useState('');
  const [editQrCode, setEditQrCode] = useState('');
  const [editQrFile, setEditQrFile] = useState<File | null>(null);
  const [editQrPreview, setEditQrPreview] = useState<string | null>(null);

  useEffect(() => {
    if (auth) {
      loadPaymentMethods();
    }
  }, [auth]);

  const loadPaymentMethods = async () => {
    if (!auth) return;
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('payment-methods'), {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPaymentMethods(data || []);
      }
    } catch (err) {
      console.error('Failed to load payment methods:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQrFileChange = (file: File | null, isEdit: boolean = false) => {
    if (!file) {
      if (isEdit) {
        setEditQrFile(null);
        setEditQrPreview(null);
      } else {
        setNewQrFile(null);
        setNewQrPreview(null);
      }
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (isEdit) {
        setEditQrFile(file);
        setEditQrPreview(base64);
        setEditQrCode(base64);
      } else {
        setNewQrFile(file);
        setNewQrPreview(base64);
        setNewQrCode(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAdd = async () => {
    if (!auth || !newUpiId.trim()) {
      alert('Please enter UPI ID');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(getApiUrl('payment-methods'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          upi_id: newUpiId.trim(),
          qr_code: newQrCode || null,
        }),
      });
      if (res.ok) {
        setNewUpiId('');
        setNewQrCode('');
        setNewQrFile(null);
        setNewQrPreview(null);
        await loadPaymentMethods();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add payment method');
      }
    } catch (err) {
      alert('Failed to add payment method');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: number) => {
    if (!auth || !editUpiId.trim()) {
      alert('Please enter UPI ID');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(getApiUrl(`payment-methods/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          upi_id: editUpiId.trim(),
          qr_code: editQrCode || null,
        }),
      });
      if (res.ok) {
        setEditingId(null);
        setEditUpiId('');
        setEditQrCode('');
        setEditQrFile(null);
        setEditQrPreview(null);
        await loadPaymentMethods();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update payment method');
      }
    } catch (err) {
      alert('Failed to update payment method');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    if (!auth) return;
    setSaving(true);
    try {
      const res = await fetch(getApiUrl(`payment-methods/${id}/toggle`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      if (res.ok) {
        await loadPaymentMethods();
      }
    } catch (err) {
      alert('Failed to toggle payment method');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!auth || !confirm('Are you sure you want to delete this payment method?')) return;
    setSaving(true);
    try {
      const res = await fetch(getApiUrl(`payment-methods/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (res.ok) {
        await loadPaymentMethods();
      }
    } catch (err) {
      alert('Failed to delete payment method');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (method: PaymentMethod) => {
    setEditingId(method.id!);
    setEditUpiId(method.upi_id);
    setEditQrCode(method.qr_code || '');
    setEditQrFile(null);
    setEditQrPreview(method.qr_code && (method.qr_code.startsWith('data:image') || method.qr_code.startsWith('http')) ? method.qr_code : null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditUpiId('');
    setEditQrCode('');
    setEditQrFile(null);
    setEditQrPreview(null);
  };

  if (!auth) {
    return (
      <div className="warning-box">
        <p className="text-sm font-semibold text-slate-50">Login Required</p>
        <p className="text-xs text-slate-200">Please login to manage payment methods.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Payment Methods</h2>
        <p className="section-subtitle">
          Manage your UPI IDs and QR codes for P2P trading offers
        </p>
      </div>

      {/* Add New Payment Method */}
      <div className="card-dark mb-6">
        <p className="text-sm font-semibold text-slate-300 mb-3">Add New Payment Method</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">UPI ID</label>
            <input
              type="text"
              className="form-input-dark w-full"
              placeholder="e.g., yourname@paytm, yourname@phonepe"
              value={newUpiId}
              onChange={(e) => setNewUpiId(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">QR Code Image</label>
            <input
              type="file"
              accept="image/*"
              className="form-input-dark w-full text-xs"
              onChange={(e) => handleQrFileChange(e.target.files?.[0] || null, false)}
            />
            {newQrPreview && (
              <div className="mt-2">
                <img
                  src={newQrPreview}
                  alt="QR Code Preview"
                  className="max-w-32 max-h-32 border border-slate-600 rounded"
                />
                <button
                  type="button"
                  className="text-xs text-red-400 mt-1"
                  onClick={() => handleQrFileChange(null, false)}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          <button
            className="btn btn-primary w-full"
            onClick={handleAdd}
            disabled={saving || !newUpiId.trim()}
          >
            {saving ? 'Adding...' : 'Add Payment Method'}
          </button>
        </div>
      </div>

      {/* Payment Methods List */}
      {loading ? (
        <p className="text-center text-slate-400">Loading...</p>
      ) : paymentMethods.length > 0 ? (
        <div className="space-y-4">
          {paymentMethods.map((method) => (
            <div key={method.id} className="card-dark">
              {editingId === method.id ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">UPI ID</label>
                    <input
                      type="text"
                      className="form-input-dark w-full"
                      value={editUpiId}
                      onChange={(e) => setEditUpiId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">QR Code Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="form-input-dark w-full text-xs"
                      onChange={(e) => handleQrFileChange(e.target.files?.[0] || null, true)}
                    />
                    {editQrPreview && (
                      <div className="mt-2">
                        <img
                          src={editQrPreview}
                          alt="QR Code Preview"
                          className="max-w-32 max-h-32 border border-slate-600 rounded"
                        />
                        <button
                          type="button"
                          className="text-xs text-red-400 mt-1"
                          onClick={() => handleQrFileChange(null, true)}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    {!editQrPreview && method.qr_code && (
                      <div className="mt-2">
                        <p className="text-xs text-slate-400 mb-1">Current QR Code:</p>
                        {method.qr_code.startsWith('data:image') || method.qr_code.startsWith('http') ? (
                          <img
                            src={method.qr_code}
                            alt="QR Code"
                            className="max-w-32 max-h-32 border border-slate-600 rounded"
                          />
                        ) : (
                          <p className="text-xs text-slate-400">QR Code exists</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-yellow flex-1"
                      onClick={() => handleUpdate(method.id!)}
                      disabled={saving}
                    >
                      Save
                    </button>
                    <button
                      className="btn btn-gray flex-1"
                      onClick={cancelEdit}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-50">{method.upi_id}</p>
                      {method.qr_code && (
                        <div className="mt-2">
                          {method.qr_code.startsWith('data:image') || method.qr_code.startsWith('http') ? (
                            <img
                              src={method.qr_code}
                              alt="QR Code"
                              className="max-w-32 max-h-32 border border-slate-600 rounded"
                            />
                          ) : (
                            <p className="text-xs text-slate-400">QR Code: {method.qr_code.substring(0, 50)}...</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={method.is_active}
                          onChange={() => handleToggleActive(method.id!, method.is_active)}
                          className="radio-toggle"
                        />
                        <span className="text-xs text-slate-300">
                          {method.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-yellow flex-1 text-xs"
                      onClick={() => startEdit(method)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-red flex-1 text-xs"
                      onClick={() => handleDelete(method.id!)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p className="empty-state-icon">💳</p>
          <p className="empty-state-title" style={{color:'white'}}>No payment methods yet</p>
          <p className="empty-state-description" style={{color:'white'}} >
            Add a payment method above to use it in your P2P trading offers
          </p>
        </div>
      )}
    </div>
  );
};
