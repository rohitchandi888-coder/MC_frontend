import React from 'react';

interface MessageModalProps {
  show: boolean;
  message: string | null;
  onClose: () => void;
}

export const MessageModal: React.FC<MessageModalProps> = ({ show, message, onClose }) => {
  if (!show || !message) return null;

  const isError = message.includes('❌') || 
    message.includes('⚠️') ||
    message.toLowerCase().includes('error') || 
    message.toLowerCase().includes('failed') || 
    message.toLowerCase().includes('invalid') || 
    message.toLowerCase().includes('please enter') ||
    message.toLowerCase().includes('unlock your wallet') ||
    message.toLowerCase().includes('required') ||
    message.toLowerCase().includes('insufficient') ||
    message.toLowerCase().includes('must be') ||
    message.toLowerCase().includes('at least') ||
    message.toLowerCase().includes('incorrect') ||
    message.toLowerCase().includes('do not match');

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-icon-large">
            {isError ? '⚠️' : '✅'}
          </div>
          <h3 className="modal-title">
            {isError ? 'Error' : 'Success'}
          </h3>
        </div>
        <p className="modal-text" style={{ lineHeight: '1.6' }}>
          {message.replace('❌', '').replace('⚠️', '').trim()}
        </p>
        <button
          className={`modal-button w-full ${isError ? 'modal-button-danger' : 'modal-button-success'}`}
          onClick={onClose}
          style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' }}
        >
          OK
        </button>
      </div>
    </div>
  );
};
