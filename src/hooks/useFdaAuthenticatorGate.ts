import { useCallback, useRef, useState } from 'react';
import type { FdaAuthStep } from '../components/modals/FdaAuthenticatorModal';
import type { AuthState } from '../components/types';
import { FDA_TOKEN_ADDRESS } from '../components/types';
import { requiresFdaAuthenticatorOnDevice } from '../utils/platform';

export function useFdaAuthenticatorGate(
  auth: AuthState | null,
  showErrorModal: (msg: string) => void,
) {
  const [showFdaAuthenticator, setShowFdaAuthenticator] = useState(false);
  const [fdaAuthStep, setFdaAuthStep] = useState<FdaAuthStep>('method');
  const pendingActionRef = useRef<(() => void | Promise<void>) | null>(null);

  const closeFdaAuthenticator = useCallback(() => {
    setShowFdaAuthenticator(false);
    setFdaAuthStep('method');
    pendingActionRef.current = null;
  }, []);

  const requestFdaAuthenticator = useCallback(
    (action: () => void | Promise<void>, options?: { onPrompt?: () => void }) => {
      if (!requiresFdaAuthenticatorOnDevice()) {
        void Promise.resolve(action());
        return;
      }
      if (!auth?.user.fdaUserId) {
        showErrorModal(
          '⚠️ FDA User ID not found on your account. Enable FDA Authenticator on futuredigiassets.com first.',
        );
        return;
      }
      pendingActionRef.current = action;
      setFdaAuthStep('method');
      options?.onPrompt?.();
      setShowFdaAuthenticator(true);
    },
    [auth, showErrorModal],
  );

  const onFdaAuthenticatorVerified = useCallback(async () => {
    const action = pendingActionRef.current;
    closeFdaAuthenticator();
    if (action) await action();
  }, [closeFdaAuthenticator]);

  return {
    showFdaAuthenticator,
    fdaAuthStep,
    setFdaAuthStep,
    requestFdaAuthenticator,
    closeFdaAuthenticator,
    onFdaAuthenticatorVerified,
  };
}

/** Internal or on-chain send when asset is FDA — gated on Android only. */
export function shouldGateFdaSend(
  transferType: 'internal' | 'onchain',
  assetType: string,
  tokenAddress: string,
): boolean {
  if (!requiresFdaAuthenticatorOnDevice()) return false;
  if (assetType !== 'token') return false;
  if (tokenAddress.toLowerCase() !== FDA_TOKEN_ADDRESS.toLowerCase()) return false;
  return transferType === 'internal' || transferType === 'onchain';
}
