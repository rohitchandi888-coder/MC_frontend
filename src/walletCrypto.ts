import { ethers } from 'ethers';

export interface EncryptedWalletData {
  version: number;
  address: string;
  cipherText: string; // base64
  iv: string; // base64
  salt: string; // base64
  iterations: number;
  createdAt: string;
}

function getSubtleCrypto(): SubtleCrypto {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available in this browser.');
  }
  return window.crypto.subtle;
}

function strToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function uint8ToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...Array.from(bytes)));
}

function base64ToUint8(str: string): Uint8Array {
  return new Uint8Array(
    atob(str)
      .split('')
      .map((c) => c.charCodeAt(0)),
  );
}

async function deriveKeyFromPassword(
  password: string,
  extraWord: string,
  salt: Uint8Array,
  iterations = 150_000,
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const baseMaterial = await subtle.importKey(
    'raw',
    strToUint8Array(`${password}:${extraWord}`) as BufferSource,
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    baseMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptPrivateKey(
  privateKey: string,
  password: string,
  extraWord: string,
  address: string,
): Promise<EncryptedWalletData> {
  const subtle = getSubtleCrypto();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKeyFromPassword(password, extraWord, salt);
  const plainBytes = strToUint8Array(
    JSON.stringify({
      privateKey,
    }),
  );

  const cipherBuf = await subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    key,
    plainBytes as BufferSource,
  );

  const cipherText = new Uint8Array(cipherBuf);

  return {
    version: 1,
    address,
    cipherText: uint8ToBase64(cipherText),
    iv: uint8ToBase64(iv),
    salt: uint8ToBase64(salt),
    iterations: 150_000,
    createdAt: new Date().toISOString(),
  };
}

export async function decryptPrivateKey(
  encrypted: EncryptedWalletData,
  password: string,
  extraWord: string,
): Promise<{ privateKey: string }> {
  const subtle = getSubtleCrypto();

  const salt = base64ToUint8(encrypted.salt);
  const iv = base64ToUint8(encrypted.iv);
  const cipherBytes = base64ToUint8(encrypted.cipherText);

  const key = await deriveKeyFromPassword(
    password,
    extraWord,
    salt,
    encrypted.iterations,
  );

  const plainBuf = await subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    key,
    cipherBytes as BufferSource,
  );

  const plainStr = new TextDecoder().decode(plainBuf);
  const payload = JSON.parse(plainStr) as { privateKey: string };
  return payload;
}

// Helper for deriving a wallet from a mnemonic (extraWord is used only for encryption in this MVP).
export function walletFromMnemonicAndExtraWord(mnemonic: string, extraWord: string, network: 'BNB Chain' | 'Solana' | 'Bitcoin' | 'Tron' = 'BNB Chain') {
  void extraWord;
  
  // Always generate EVM wallet first (for private key)
  const evmWallet = ethers.Wallet.fromPhrase(mnemonic.trim());
  
  if (network === 'BNB Chain') {
    return evmWallet; // Return standard ethers wallet for BNB Chain
  }
  
  // For other networks, generate network-specific addresses
  // The private key is still from the EVM wallet (for encryption/decryption)
  // But the address is network-specific
  let networkAddress: string;
  
  if (network === 'Solana') {
    networkAddress = generateSolanaAddress(mnemonic);
  } else if (network === 'Bitcoin') {
    networkAddress = generateBitcoinAddress(mnemonic);
  } else if (network === 'Tron') {
    networkAddress = generateTronAddress(evmWallet.privateKey);
  } else {
    networkAddress = evmWallet.address; // Fallback
  }
  
  // Return object with network-specific address but EVM private key
  return {
    address: networkAddress,
    privateKey: evmWallet.privateKey,
    publicKey: evmWallet.publicKey,
    mnemonic: evmWallet.mnemonic,
    network: network,
  } as ethers.Wallet & { network: string };
}

// Address generation functions for different networks
// Note: These are simplified implementations. For production, use proper libraries:
// - Solana: @solana/web3.js
// - Bitcoin: bitcoinjs-lib
// - Tron: tronweb

function generateSolanaAddress(mnemonic: string): string {
  // Solana addresses are base58 encoded and typically 32-44 characters
  // Using keccak256 hash of mnemonic to generate a deterministic address
  const hash = ethers.keccak256(ethers.toUtf8Bytes(mnemonic));
  // Solana addresses are base58, but for now we'll use a hex-based approach
  // In production, use: import { Keypair } from '@solana/web3.js';
  const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let num = BigInt('0x' + hash.slice(2));
  let address = '';
  for (let i = 0; i < 44 && num > 0n; i++) {
    address = base58Chars[Number(num % 58n)] + address;
    num = num / 58n;
  }
  return address || '3DbQj2fhLhc426Y5LSKpCr95txTx478FsTEUNSSSZTdp'; // Fallback example format
}

function generateBitcoinAddress(mnemonic: string): string {
  // Bitcoin addresses can be legacy (starts with 1), P2SH (starts with 3), or bech32 (starts with bc1q)
  // Using keccak256 hash to generate deterministic address
  const hash = ethers.keccak256(ethers.toUtf8Bytes(mnemonic));
  // For bech32 format (native segwit)
  const hashPart = hash.slice(2, 42); // Take 40 chars from hash
  return `bc1q${hashPart}`;
}

function generateTronAddress(privateKey: string): string {
  // Tron addresses are base58 encoded and start with 'T'
  // Tron uses the same secp256k1 curve as Ethereum but with different address encoding
  const wallet = new ethers.Wallet(privateKey);
  // Tron address is derived from Ethereum address but with different encoding
  // For now, we'll generate a deterministic address based on the private key
  const hash = ethers.keccak256(ethers.toUtf8Bytes(wallet.address));
  const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let num = BigInt('0x' + hash.slice(2));
  let address = 'T';
  for (let i = 0; i < 33 && num > 0n; i++) {
    address += base58Chars[Number(num % 58n)];
    num = num / 58n;
  }
  return address || 'THaxRjXfQv2fWi4JWnQyAYKgT6zT6GA5rL'; // Fallback example format
}


