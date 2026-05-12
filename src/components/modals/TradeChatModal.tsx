import React, { useEffect, useMemo, useState } from 'react';
import { getApiUrl } from '../../config';
import { getReleaseTimeline } from '../p2p/p2pTradeTimers';

type TradeChatModalProps = {
  show: boolean;
  trade: any | null;
  auth: { token?: string; user?: { id?: number } } | null;
  onClose: () => void;
  onError?: (message: string) => void;
};

type TradeMessage = {
  id: number;
  sender_id: number;
  sender_name?: string;
  sender_email?: string;
  message: string;
  created_at: string;
};

const isClosedStatus = (status: string) => {
  const s = String(status || '').toUpperCase();
  return s === 'COMPLETED' || s === 'CANCELLED';
};

export const TradeChatModal: React.FC<TradeChatModalProps> = ({ show, trade, auth, onClose, onError }) => {
  const [messages, setMessages] = useState<TradeMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');

  const closed = isClosedStatus(String(trade?.status || ''));
  const statusUpper = String(trade?.status || '').toUpperCase();
  const showReleaseTimeline = statusUpper === 'PAID_PENDING_RELEASE';
  const viewerRole =
    Number(auth?.user?.id) === Number(trade?.seller_id)
      ? 'seller'
      : Number(auth?.user?.id) === Number(trade?.buyer_id)
        ? 'buyer'
        : 'buyer';
  const [releaseClock, setReleaseClock] = useState(() => Date.now());
  useEffect(() => {
    if (!show || !showReleaseTimeline) return;
    setReleaseClock(Date.now());
    const id = window.setInterval(() => setReleaseClock(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, [show, showReleaseTimeline, trade?.id]);
  const releaseTl = showReleaseTimeline ? getReleaseTimeline(trade, releaseClock, viewerRole) : null;

  const paymentRows = useMemo(() => {
    let raw: any = trade?.seller_payment_methods || trade?.payment_method || trade?.paymentMethods || null;
    if (!raw) return [] as Array<{ key: string; value: string }>;
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch {
        return [{ key: 'Payment', value: raw }];
      }
    }
    if (!Array.isArray(raw)) raw = [raw];
    const first = raw[0];
    if (!first || typeof first !== 'object') return [];
    const rows: Array<{ key: string; value: string }> = [];
    Object.entries(first).forEach(([k, v]) => {
      if (v == null) return;
      const key = String(k || '').trim();
      const val = String(v).trim();
      if (!val) return;
      if (key.toLowerCase().includes('qr') && val.startsWith('data:image')) return;
      rows.push({ key, value: val });
    });
    return rows;
  }, [trade]);

  const loadMessages = async () => {
    if (!auth?.token || !trade?.id) return;
    setLoading(true);
    try {
      const res = await fetch(getApiUrl(`trades/${trade.id}/messages`), {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.error || 'Failed to load chat');
      setMessages(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (onError) onError(err?.message || 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!show || !trade?.id) return;
    setDraft('');
    void loadMessages();
  }, [show, trade?.id]);

  useEffect(() => {
    if (!show || !trade?.id || closed) return;
    const t = window.setInterval(() => {
      void loadMessages();
    }, 5000);
    return () => window.clearInterval(t);
  }, [show, trade?.id, closed]);

  const sendMessage = async () => {
    if (!auth?.token || !trade?.id || !draft.trim() || sending || closed) return;
    setSending(true);
    try {
      const res = await fetch(getApiUrl(`trades/${trade.id}/messages`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ message: draft.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to send message');
      setDraft('');
      await loadMessages();
    } catch (err: any) {
      if (onError) onError(err?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (!show || !trade) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Trade Chat #{trade.id}</h3>
        <div className="modal-content">
          <p className="modal-text">
            Status: <strong>{trade.status}</strong>
          </p>
          {releaseTl && (
            <div
              style={{
                marginBottom: 10,
                padding: '8px 10px',
                borderRadius: 8,
                border: `1px solid ${releaseTl.overdue ? '#fecaca' : '#334155'}`,
                background: releaseTl.overdue ? '#450a0a' : '#0f172a',
              }}
            >
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: releaseTl.overdue ? '#fecaca' : '#fde68a' }}>
                {releaseTl.headline}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>{releaseTl.detail}</p>
            </div>
          )}
          {closed && (
            <p className="modal-info-text-small" style={{ color: '#f87171' }}>
              Chat closed because FDA has been released / trade is finished.
            </p>
          )}

          {paymentRows.length > 0 && (
            <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 8, marginBottom: 10 }}>
              <p style={{ margin: 0, marginBottom: 8, fontWeight: 700, color: '#e2e8f0' }}>Payment details</p>
              <div style={{ display: 'grid', gap: 6 }}>
                {paymentRows.map((row, idx) => (
                  <div key={`${row.key}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>{row.key}</span>
                    <span style={{ color: '#e2e8f0', fontSize: 12, maxWidth: 210, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 8, maxHeight: 260, overflowY: 'auto' }}>
            {loading ? (
              <p className="modal-info-text-small">Loading chat...</p>
            ) : messages.length === 0 ? (
              <p className="modal-info-text-small">No messages yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {messages.map((m) => {
                  const mine = Number(m.sender_id) === Number(auth?.user?.id || 0);
                  return (
                    <div key={m.id} style={{ background: mine ? '#1e3a8a' : '#1f2937', borderRadius: 8, padding: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
                        <span style={{ color: '#cbd5e1', fontSize: 11 }}>
                          {mine ? 'You' : (m.sender_name || m.sender_email || 'Trader')}
                        </span>
                        <span style={{ color: '#94a3b8', fontSize: 10 }}>
                          {m.created_at ? new Date(m.created_at).toLocaleTimeString() : ''}
                        </span>
                      </div>
                      <div style={{ color: '#f8fafc', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13 }}>{m.message}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            <textarea
              className="modal-input"
              rows={3}
              placeholder={closed ? 'Chat is closed for this trade.' : 'Type your message...'}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={closed || sending}
            />
            <button
              type="button"
              className={`modal-button ${closed || sending || !draft.trim() ? 'modal-button-secondary' : 'modal-button-primary'}`}
              onClick={() => void sendMessage()}
              disabled={closed || sending || !draft.trim()}
            >
              {sending ? 'Sending...' : 'Send message'}
            </button>
          </div>
        </div>
        <div className="modal-actions">
          <button className="modal-button modal-button-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
