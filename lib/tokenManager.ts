/**
 * Dedicated utility for persisting and managing Hydro-tokens.
 * Handles local storage synchronization and provides a foundation for future database integration.
 */

const STORAGE_KEY = 'hydro_tokens_balance';

export const TokenManager = {
  /**
   * Retrieves the current token balance from local storage.
   */
  loadBalance(): number {
    if (typeof window === 'undefined') return 0;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 0;
  },

  /**
   * Saves the token balance to local storage.
   */
  saveBalance(amount: number): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, amount.toString());
  }
};