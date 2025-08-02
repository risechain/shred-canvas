import { Address } from 'viem';

/**
 * Format an address to lowercase for consistent comparison
 */
export const formatAddress = (address: string | Address): string => {
  return address.toLowerCase() as Address;
};

/**
 * Check if two addresses are the same (case-insensitive)
 */
export const isSameAddress = (addr1?: string | Address, addr2?: string | Address): boolean => {
  if (!addr1 || !addr2) return false;
  return formatAddress(addr1) === formatAddress(addr2);
};

/**
 * Shorten an address for display (0x1234...5678)
 */
export const shortenAddress = (address: string | Address, chars = 4): string => {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

/**
 * Validate if a string is a valid Ethereum address
 */
export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};