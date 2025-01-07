import { BrowserProvider, Contract } from "ethers";

export interface TokenInfo {
  totalSupply: string;
  virtualTokenReserve: string;
  virtualEthReserve: string;
  migrated: boolean;
  emergencyMode: boolean;
  totalCollectedETH: string;
}

export interface FactoryContextType {
  provider: BrowserProvider | null;
  address: string | null;
  connecting: boolean;
  factoryContract: Contract | null;
  connectWallet: () => Promise<void>;
  deployToken: (params: {
    name: string;
    symbol: string;
    admin: string;
  }) => Promise<string>;
  isValidToken: (tokenAddress: string) => Promise<boolean>;
  getUniswapAddresses: () => Promise<{
    router: string;
    factory: string;
  }>;
}

export interface TokenContextType {
  provider: BrowserProvider | null;
  address: string | null;
  connecting: boolean;
  contract: Contract | null;
  
  // Core Functions
  buy: (ethAmount: string) => Promise<void>;
  sell: (tokenAmount: string) => Promise<void>;
  withdrawPendingPayments: () => Promise<void>;
  setEmergencyMode: (mode: boolean) => Promise<void>;
  withdrawFees: () => Promise<void>;
  emergencyWithdraw: () => Promise<void>;
  
  // View Functions
  calculatePurchaseReturn: (ethAmount: string) => Promise<string>;
  calculateSaleReturn: (tokenAmount: string) => Promise<string>;
  calculatePriceImpact: (amount: string, reserve: string) => Promise<number>;
  getBalance: (address?: string) => Promise<string>;
  getPendingWithdrawals: (address?: string) => Promise<string>;
  
  // State Checks
  isMigrated: () => Promise<boolean>;
  isEmergencyMode: () => Promise<boolean>;
  getActionCounter: (address?: string) => Promise<number>;
  getLastActionTime: (address?: string) => Promise<number>;
  
  // Constants
  getConstants: () => Promise<{
    TOTAL_SUPPLY: string;
    INITIAL_VIRTUAL_TOKEN_RESERVE: string;
    INITIAL_VIRTUAL_ETH_RESERVE: string;
    MIGRATION_THRESHOLD: string;
    MIGRATION_FEE: string;
    MIN_PURCHASE: string;
    MAX_PURCHASE: string;
    PRICE_IMPACT_LIMIT: number;
    RATE_LIMIT_INTERVAL: number;
    MAX_ACTIONS_IN_INTERVAL: number;
  }>;
}

interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request?: (...args: any[]) => Promise<any>;
      on?: (...args: any[]) => void;
      removeListener?: (...args: any[]) => void;
      send?: (...args: any[]) => Promise<any>;
      selectedAddress?: string;
    }
  }
  
  declare module 'ethers' {
    export interface BrowserProvider {
      send: (method: string, params: any[] | Record<string, any>) => Promise<any>;
    }
  }