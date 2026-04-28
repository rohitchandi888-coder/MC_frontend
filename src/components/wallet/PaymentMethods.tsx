import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../config';
import type { AuthState } from '../types';


/**
 * 
 * @param upi username@bank name.surname@okaxis 1234567890@paytm
 * @returns 
 */
function isValidUpiId(upi: string): boolean {
  if (!upi) return false;

  const trimmed = upi.trim();

  // UPI regex
  const upiRegex = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;

  return upiRegex.test(trimmed);
}


interface PaymentMethod {
  id?: number;
  paymentname: string;
  upi_id?: string | null;
  qr_code?: string | null;
  is_active: boolean;
  type?: 'UPI' | 'QR';
  offerFiatCurrency: 'USD' | 'EUR' | 'GBP' | 'INR'
}

interface PaymentMethodsProps {
  auth: AuthState | null;
}

export const PaymentMethods: React.FC<PaymentMethodsProps> = ({ auth }) => {
  const [selectedFiat, setSelectedFiat] = useState<'USD' | 'EUR' | 'GBP' | 'INR'>('INR');
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
  const [newName, setNewName] = useState('');
  const [paymentType, setPaymentType] = useState<'UPI' | 'QR'>('UPI');
  // yeh line add karo (edit name ke liye alag state chahiye)
  const [editName, setEditName] = useState<string>('');

  // yeh line add karo (edit karte waqt type yaad rakhne ke liye)
  const [editType, setEditType] = useState<'UPI' | 'QR' | null>(null);

  useEffect(() => {
    if (auth) {
      loadPaymentMethods();
    }
  }, [auth]);

  const loadPaymentMethods = async () => {
    if (!auth) return;

    setLoading(true);

    try {

      const res = await fetch(getApiUrl("payment-methods"), {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (res.ok) {

        const data = await res.json();

        // ensure correct field names
        const formatted = data.map((item: any) => ({
          id: item.id,
          paymentname: item.paymentname,
          upi_id: item.upi_id,
          qr_code: item.qr_code,
          is_active: item.is_active,
        }));

        setPaymentMethods(formatted);

      }

    } catch (err) {

      console.error("Failed to load payment methods:", err);

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

  if (!auth) return;

  if (!newName.trim()) {
    alert("Please enter payment method name");
    return;
  }

  if (paymentType === "UPI") {
    if (!isValidUpiId(newUpiId)) {
      alert("Please enter a valid UPI ID");
      return;
    }
  }

  if (paymentType === "QR") {
    if (!newQrCode) {
      alert("Please upload QR screenshot");
      return;
    }
  }

  setSaving(true);

  try {

    const cleanName = newName.includes('|')
      ? newName.split('|').pop()
      : newName;
    const res = await fetch(getApiUrl("payment-methods"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({
    paymentName: `${selectedFiat}|${cleanName}`,
        fiat_currency: selectedFiat, 

        upi_id:
          paymentType === "UPI"
            ? newUpiId.trim()
            : null,

        qr_code:
          paymentType === "QR"
            ? newQrCode
            : null,

      }),
    });

    if (res.ok) {

      setNewName("");
      setNewUpiId("");
      setNewQrCode("");
      setNewQrFile(null);
      setNewQrPreview(null);
      setPaymentType("UPI");

      await loadPaymentMethods();

    } else {

      const data = await res.json();
      alert(data.error || "Failed to add payment method");

    }

  } catch {

    alert("Failed to add payment method");

  } finally {

    setSaving(false);

  }

};

  const handleUpdate = async (id: number) => {
    if (!auth || !editType) return;

    if (!editName.trim()) {
      alert("Method name is required");
      return;
    }

    const isUpi = editType === 'UPI';

    if (isUpi && !isValidUpiId(editUpiId)) {
      alert("Please enter a valid UPI ID");
      return;
    }

    setSaving(true);

    const cleanName = editName.includes('|')
  ? editName.split('|').pop()
  : editName;
    try {
      const payload: any = {
        paymentName: `${selectedFiat}|${cleanName}`,
      };

      if (isUpi) {
        payload.upi_id = editUpiId.trim();
        payload.qr_code = null;
      } else {
        payload.upi_id = null;
        payload.qr_code = editQrCode || undefined;
      }

      const res = await fetch(getApiUrl(`payment-methods/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditingId(null);
        setEditName('');
        setEditUpiId('');
        setEditQrCode('');
        setEditQrFile(null);
        setEditQrPreview(null);
        setEditType(null);
        await loadPaymentMethods();
      } else {
        const data = await res.json();
        alert(data.error || 'Update nahi hua');
      }
    } catch (err) {
      alert('Kuch galat ho gaya');
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

    const isUpi = !!method.upi_id;
    setEditType(isUpi ? 'UPI' : 'QR');

    // ──────────────────────────────── FIX HERE ────────────────────────────────
    // setEditName(method.paymentname || method.paymentName || method.name || '');
    setEditName(method.paymentname?.split('|')[1] || method.paymentname);

    // If you want to be extra safe:
    // setEditName(String(method.paymentname ?? method.paymentName ?? ''));

    if (isUpi) {
      setEditUpiId(method.upi_id || '');
      setEditQrCode('');
      setEditQrPreview(null);
      setEditQrFile(null);
    } else {
      setEditUpiId('');
      setEditQrCode(method.qr_code || '');
      setEditQrPreview(
        method.qr_code && (method.qr_code.startsWith('data:') || method.qr_code.startsWith('http'))
          ? method.qr_code
          : null
      );
      setEditQrFile(null);
    }
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
    <div className="pb-32 md:pb-6">
      <div className="section-header">
        <h2 className="section-title">Payment Methods</h2>
        <p className="section-subtitle">
          Manage your UPI IDs and QR codes for P2P trading offers
        </p>
      </div>

      <div className="card-dark mb-3 md:mb-4">
        <label className="text-sm text-slate-300 mb-1.5 block font-medium">
          Payment Currency
        </label>

        <select
          className="form-input-dark w-full"
          value={selectedFiat}
          onChange={(e) => setSelectedFiat(e.target.value as any)}
        >
          <option value="INR">INR (India)</option>
          <option value="USD">USD (USA)</option>
          <option value="EUR">EUR (Europe)</option>
          <option value="GBP">GBP (UK)</option>
        </select>
      </div>
      {/* Add New Payment Method */}
      <div className="card-dark mb-4 md:mb-6">
        <p className="text-sm font-semibold text-slate-300 mb-3">Add New Payment Method</p>
        {selectedFiat !== 'INR' ? (
          <p className="text-sm text-amber-300">
            Payment methods for {selectedFiat} will be added soon.
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-300 mb-1.5 block font-medium">Payment Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`min-h-10 rounded-lg border text-sm font-medium transition-colors ${
                    paymentType === 'UPI'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                      : 'bg-slate-800/60 border-slate-600 text-slate-300'
                  }`}
                  onClick={() => {
                    setPaymentType("UPI");
                    setNewQrCode("");
                    setNewQrPreview(null);
                  }}
                >
                  UPI ID
                </button>
                <button
                  type="button"
                  className={`min-h-10 rounded-lg border text-sm font-medium transition-colors ${
                    paymentType === 'QR'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                      : 'bg-slate-800/60 border-slate-600 text-slate-300'
                  }`}
                  onClick={() => {
                    setPaymentType("QR");
                    setNewUpiId("");
                  }}
                >
                  QR Screenshot
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-300 mb-1.5 block font-medium">
                Name (example: Personal UPI)
              </label>
              <input
                type="text"
                className="form-input-dark w-full"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter payment method name"
              />
            </div>
            {paymentType === 'UPI' && (
              <div style={{ marginBlock: 10 }}>
                <label className="text-sm text-slate-300 mb-1.5 block font-medium">UPI ID</label>
                <input
                  type="text"
                  className="form-input-dark w-full"
                  value={newUpiId}
                  onChange={(e) => setNewUpiId(e.target.value)}
                  placeholder="yourname@upi"
                />
                {newUpiId && !isValidUpiId(newUpiId) && (
                  <p style={{ color: '#ff0000' }}>Invalid UPI ID</p>
                )}
              </div>
            )}
            {paymentType === 'QR' && (
              <div style={{ display: 'flex', flexDirection: 'column', marginBlock: 10 }}>
                <label className="text-sm text-slate-300 mb-1.5 block font-medium">
                  Upload QR Screenshot
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="form-input-dark w-full text-xs"
                  onChange={(e) =>
                    handleQrFileChange(e.target.files?.[0] || null)
                  }
                />
                {newQrPreview && (
                  <img
                    src={newQrPreview}
                    className="w-full max-w-44 mt-2 rounded border border-slate-600 object-contain"
                  />
                )}
              </div>
            )}
            <button
              className="btn btn-primary w-full min-h-11"
              onClick={handleAdd}
              disabled={
                saving ||
                !newName.trim() ||
                (paymentType === "UPI" && !newUpiId.trim()) ||
                (paymentType === "QR" && !newQrCode)
              }
            >
              {saving ? "Adding..." : "Add Payment Method"}
            </button>
          </div>
        )}
      </div>

      {/* Payment Methods List */}
      {loading ? (
        <p className="text-center text-slate-400">Loading...</p>
      ) : paymentMethods.length > 0 ? (
        <div className="space-y-3 md:space-y-4">
          {paymentMethods.map((method) => (

            <div key={method.id} className="card-dark p-3 md:p-4">
              {editingId === method.id ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-300 mb-1.5 block font-medium">Method Name</label>
                    <input
                      type="text"
                      className="form-input-dark w-full"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Example: Personal PhonePe"
                    />
                  </div>

                  {editType === 'UPI' ? (
                    <div>
                      <label className="text-sm text-slate-300 mb-1.5 block font-medium">UPI ID</label>
                      <input
                        type="text"
                        className="form-input-dark w-full"
                        value={editUpiId}
                        onChange={(e) => setEditUpiId(e.target.value)}
                        placeholder="yourname@okaxis"
                      />
                      {editUpiId && !isValidUpiId(editUpiId) && (
                        <p className="text-red-500 text-xs mt-1">Invalid UPI ID</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="text-sm text-slate-300 mb-1.5 block font-medium">QR Code (upload new image to replace)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleQrFileChange(e.target.files?.[0] || null, true)}
                      />
                      {editQrPreview ? (
                        <div className="mt-3 relative inline-block">
                          <img src={editQrPreview} alt="New QR" className="w-full max-w-44 rounded border border-slate-600 object-contain" />
                          <button
                            type="button"
                            className="absolute top-1 right-1 
               bg-black/70 hover:bg-black 
               text-white text-xs 
               w-6 h-6 flex items-center justify-center 
               rounded-full shadow-md 
               transition-all duration-200"
                            onClick={() => handleQrFileChange(null, true)}
                          >
                            X
                          </button>
                        </div>
                      ) : method.qr_code ? (
                        <div className="mt-3">
                          <p className="text-xs text-slate-400 mb-1">Current QR:</p>
                          <img src={method.qr_code} alt="Current QR" className="w-full max-w-44 rounded border border-slate-600 object-contain" />
                        </div>
                      ) : null}
                    </div>
                  )}

                  <div className="flex gap-2 md:gap-3 mt-4">
                    <button
                      className="btn btn-yellow flex-1 min-h-10"
                      onClick={() => handleUpdate(method.id!)}
                      disabled={saving}
                    >
                      Save
                    </button>
                    <button
                      className="btn btn-gray flex-1 min-h-10"
                      onClick={cancelEdit}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-2 gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-50 break-words">{method.paymentname?.split('|')[1] || method.paymentname}</p>
                      {method.upi_id && (
                        <p className="text-xs text-slate-400">{method.upi_id}</p>
                      )}
                      {method.qr_code && (
                        <div className="mt-2">
                          {method.qr_code.startsWith('data:image') || method.qr_code.startsWith('http') ? (
                            <img
                              src={method.qr_code}
                              alt="QR Code"
                              className="w-full max-w-36 max-h-36 border border-slate-600 rounded object-contain"
                            />
                          ) : (
                            <p className="text-xs text-slate-400">QR Code: {method.qr_code.substring(0, 50)}...</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(method.id!, method.is_active)}
                        className={`min-h-8 px-2.5 rounded-full text-[11px] font-semibold border transition-colors ${
                          method.is_active
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                            : 'bg-slate-700/60 border-slate-500 text-slate-300'
                        }`}
                        aria-label={method.is_active ? 'Set inactive' : 'Set active'}
                      >
                        {method.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="btn btn-yellow text-xs min-h-10"
                      onClick={() => startEdit(method)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-red text-xs min-h-10"
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
          <p className="empty-state-title" style={{ color: 'white' }}>No payment methods yet</p>
          <p className="empty-state-description" style={{ color: 'white' }} >
            Add a payment method above to use it in your P2P trading offers
          </p>
        </div>
      )}
    </div>
  );
};
