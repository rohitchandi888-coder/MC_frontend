import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getApiUrl } from '../../config';

export type FdaAuthStep = 'method' | 'otp';

interface FdaAuthenticatorModalProps {
  show: boolean;
  step: FdaAuthStep;
  fdaUserId: string | null;
  authToken: string;
  verifying?: boolean;
  errorMessage?: string | null;
  onStepChange: (step: FdaAuthStep) => void;
  onClose: () => void;
  onVerified: () => void;
}

const OTP_LEN = 6;

export const FdaAuthenticatorModal: React.FC<FdaAuthenticatorModalProps> = ({
  show,
  step,
  fdaUserId,
  authToken,
  verifying = false,
  errorMessage,
  onStepChange,
  onClose,
  onVerified,
}) => {
  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LEN).fill(''));
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const resetOtp = useCallback(() => {
    setDigits(Array(OTP_LEN).fill(''));
    setLocalError(null);
    setTimeout(() => inputRefs.current[0]?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!show) return;
    if (step === 'otp') resetOtp();
  }, [show, step, resetOtp]);

  useEffect(() => {
    if (errorMessage) setLocalError(errorMessage);
  }, [errorMessage]);

  if (!show) return null;

  const otpCode = digits.join('').trim().toUpperCase();

  const handleDigitChange = (index: number, raw: string) => {
    const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!cleaned) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      setLocalError(null);
      return;
    }
    const char = cleaned.slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    setLocalError(null);
    if (index < OTP_LEN - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData('text')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, OTP_LEN);
    if (!pasted) return;
    const next = Array(OTP_LEN).fill('');
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, OTP_LEN - 1)]?.focus();
  };

  const verifyOtp = async () => {
    if (otpCode.length !== OTP_LEN) {
      setLocalError('Enter the full 6-character code from FDA Authenticator.');
      return;
    }
    if (!fdaUserId) {
      setLocalError('FDA User ID is missing on your account.');
      return;
    }
    setSubmitting(true);
    setLocalError(null);
    try {
      const res = await fetch(getApiUrl('auth/fda-otp-verify'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ otp: otpCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLocalError(data.error || 'Invalid authenticator code. Try again.');
        return;
      }
      onVerified();
    } catch {
      setLocalError('Could not verify code. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const busy = verifying || submitting;
  const displayError = localError || errorMessage;

  return (
    <div
      className="modal-overlay fda-auth-overlay"
      onClick={onClose}
      style={{ zIndex: 10050 }}
    >
      <div className="modal-container fda-auth-modal" onClick={(e) => e.stopPropagation()}>
        {step === 'method' ? (
          <>
            <h3 className="fda-auth-title">Verification</h3>
            <p className="fda-auth-subtitle">Select verification method</p>
            <label className="fda-auth-label" htmlFor="fda-auth-method">
              Method
            </label>
            <select id="fda-auth-method" className="fda-auth-select" defaultValue="authenticator" disabled={busy}>
              <option value="authenticator">Authenticator App</option>
            </select>
            <div className="fda-auth-actions">
              <button
                type="button"
                className="fda-auth-btn fda-auth-btn-primary"
                disabled={busy}
                onClick={() => onStepChange('otp')}
              >
                Continue
              </button>
              <button type="button" className="fda-auth-btn fda-auth-btn-secondary" onClick={onClose} disabled={busy}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="fda-auth-title">FDA Authenticator</h3>
            <p className="fda-auth-subtitle">Enter code from FDA Authenticator</p>
            <div className="fda-auth-otp-row" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="text"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  maxLength={1}
                  className="fda-auth-otp-cell"
                  value={d}
                  disabled={busy}
                  aria-label={`Character ${i + 1}`}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(i, e)}
                />
              ))}
            </div>
            {displayError && (
              <p className="fda-auth-error" role="alert">
                {displayError}
              </p>
            )}
            <div className="fda-auth-actions">
              <button
                type="button"
                className="fda-auth-btn fda-auth-btn-primary"
                disabled={busy || otpCode.length !== OTP_LEN}
                onClick={() => void verifyOtp()}
              >
                {busy ? 'Verifying…' : 'Verify OTP'}
              </button>
              <button
                type="button"
                className="fda-auth-btn fda-auth-btn-secondary"
                onClick={() => {
                  resetOtp();
                  onStepChange('method');
                }}
                disabled={busy}
              >
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
