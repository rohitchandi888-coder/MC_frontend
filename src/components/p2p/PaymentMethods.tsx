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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editUpiId, setEditUpiId] = useState('');
  const [editQrCode, setEditQrCode] = useState('');
    const [isOn, setIsOn] = useState(false);

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
          qr_code: newQrCode.trim() || null,
        }),
      });
      if (res.ok) {
        setNewUpiId('');
        setNewQrCode('');
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
          qr_code: editQrCode.trim() || null,
        }),
      });
      if (res.ok) {
        setEditingId(null);
        setEditUpiId('');
        setEditQrCode('');
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
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditUpiId('');
    setEditQrCode('');
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
            <label className="text-xs text-slate-400 mb-1 block">QR Code (Base64 or URL)</label>
            <textarea
              className="form-input-dark w-full"
              rows={3}
              placeholder="Paste QR code image as base64 or enter image URL"
              value={newQrCode}
              onChange={(e) => setNewQrCode(e.target.value)}
            />
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


                 <div
                      onClick={() => setIsOn(!isOn)}
                      style={{
                        width: "52px",
                        height: "28px",
                        background: isOn
                          ? "linear-gradient(135deg, #22c55e, #16a34a)"
                          : "#cbd5e1",
                        borderRadius: "50px",
                        position: "relative",
                        cursor: "pointer",
                        transition: "0.3s"
                      }}
                    >
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          background: "#fff",
                          borderRadius: "50%",
                          position: "absolute",
                          top: "2px",
                          left: isOn ? "26px" : "2px",
                          transition: "0.3s"
                        }}
                      />
                    </div>

                    <span style={{ fontSize: "13px", fontWeight: "600" }}>
                      {isOn ? "ON" : "OFF"}
                    </span>


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
                    <label className="text-xs text-slate-400 mb-1 block">QR Code</label>
                    <textarea
                      className="form-input-dark w-full"
                      rows={3}
                      value={editQrCode}
                      onChange={(e) => setEditQrCode(e.target.value)}
                    />
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
          <p className="empty-state-title">No payment methods yet</p>
          <p className="empty-state-description">
            Add a payment method above to use it in your P2P trading offers
          </p>
        </div>
      )}
    </div>
  );
};
