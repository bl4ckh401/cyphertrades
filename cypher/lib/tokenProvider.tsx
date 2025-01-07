// lib/tokenProvider.ts
import { createContext, useContext, useState } from "react"
import { BrowserProvider, Contract, formatEther, parseEther } from "ethers"
import { TokenContextType } from "./types";

export const TOKEN_ABI = [/* ... your ABI ... */];

const TokenContext = createContext<any>(null);

export function TokenProvider({ 
  children,
  tokenAddress 
}: { 
  children: React.ReactNode
  tokenAddress: string 
}) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [contract, setContract] = useState<Contract | null>(null);

  // Core Functions
  const buy = async (ethAmount: string) => {
    if (!contract) throw new Error("Contract not initialized");
    try {
      const tx = await contract.buy({ value: parseEther(ethAmount) });
      await tx.wait();
    //   toast({ title: "Success", description: `Bought tokens for ${ethAmount} ETH` });
    } catch (error: any) {
    //   toast({ title: "Error", description: error.message, variant: "destructive" });
      throw error;
    }
  };

  const withdrawPendingPayments = async () => {
    if (!contract) throw new Error("Contract not initialized");
    try {
      const tx = await contract.withdrawPendingPayments();
      await tx.wait();
    //   toast({ title: "Success", description: "Withdrawn pending payments" });
    } catch (error: any) {
    //   toast({ title: "Error", description: error.message, variant: "destructive" });
      throw error;
    }
  };

  const setEmergencyMode = async (mode: boolean) => {
    if (!contract) throw new Error("Contract not initialized");
    try {
      const tx = await contract.setEmergencyMode(mode);
      await tx.wait();
    //   toast({ title: "Success", description: `Emergency mode ${mode ? 'enabled' : 'disabled'}` });
    } catch (error: any) {
    //   toast({ title: "Error", description: error.message, variant: "destructive" });
      throw error;
    }
  };

  const withdrawFees = async () => {
    if (!contract) throw new Error("Contract not initialized");
    try {
      const tx = await contract.withdrawFees();
      await tx.wait();
    //   toast({ title: "Success", description: "Fees withdrawn" });
    } catch (error: any) {
    //   toast({ title: "Error", description: error.message, variant: "destructive" });
      throw error;
    }
  };

  const emergencyWithdraw = async () => {
    if (!contract) throw new Error("Contract not initialized");
    try {
      const tx = await contract.emergencyWithdraw();
      await tx.wait();
    //   toast({ title: "Success", description: "Emergency withdrawal completed" });
    } catch (error: any) {
    //   toast({ title: "Error", description: error.message, variant: "destructive" });
      throw error;
    }
  };

  // View Functions
  const calculatePurchaseReturn = async (ethAmount: string): Promise<string> => {
    if (!contract) return "0";
    try {
      const result = await contract.calculatePurchaseReturn(parseEther(ethAmount));
      return formatEther(result);
    } catch (error) {
      console.error(error);
      return "0";
    }
  };

  const calculateSaleReturn = async (tokenAmount: string): Promise<string> => {
    if (!contract) return "0";
    try {
      const result = await contract.calculateSaleReturn(parseEther(tokenAmount));
      return formatEther(result);
    } catch (error) {
      console.error(error);
      return "0";
    }
  };

  const calculatePriceImpact = async (amount: string, reserve: string): Promise<number> => {
    if (!contract) return 0;
    try {
      const impact = await contract.calculatePriceImpact(parseEther(amount), parseEther(reserve));
      return Number(formatEther(impact));
    } catch (error) {
      console.error(error);
      return 0;
    }
  };

  const getBalance = async (address?: string): Promise<string> => {
    if (!contract) return "0";
    try {
      const balance = await contract.balanceOf(address || contract.address);
      return formatEther(balance);
    } catch (error) {
      console.error(error);
      return "0";
    }
  };

  const getPendingWithdrawals = async (address?: string): Promise<string> => {
    if (!contract) return "0";
    try {
      const pending = await contract.pendingWithdrawals(address || contract.address);
      return formatEther(pending);
    } catch (error) {
      console.error(error);
      return "0";
    }
  };

  // State Checks
  const isMigrated = async (): Promise<boolean> => {
    if (!contract) return false;
    try {
      return await contract.migrated();
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const isEmergencyMode = async (): Promise<boolean> => {
    if (!contract) return false;
    try {
      return await contract.emergencyMode();
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const getActionCounter = async (address?: string): Promise<number> => {
    if (!contract) return 0;
    try {
      const count = await contract.actionCounter(address || contract.address);
      return Number(count);
    } catch (error) {
      console.error(error);
      return 0;
    }
  };

  const getLastActionTime = async (address?: string): Promise<number> => {
    if (!contract) return 0;
    try {
      const time = await contract.lastActionTime(address || contract.address);
      return Number(time);
    } catch (error) {
      console.error(error);
      return 0;
    }
  };

  // Constants
  const getConstants = async () => {
    if (!contract) throw new Error("Contract not initialized");
    try {
      const [
        totalSupply,
        initialVirtualTokenReserve,
        initialVirtualEthReserve,
        migrationThreshold,
        migrationFee,
        minPurchase,
        maxPurchase,
        priceImpactLimit,
        rateLimitInterval,
        maxActionsInInterval
      ] = await Promise.all([
        contract.TOTAL_SUPPLY(),
        contract.INITIAL_VIRTUAL_TOKEN_RESERVE(),
        contract.INITIAL_VIRTUAL_ETH_RESERVE(),
        contract.MIGRATION_THRESHOLD(),
        contract.MIGRATION_FEE(),
        contract.MIN_PURCHASE(),
        contract.MAX_PURCHASE(),
        contract.PRICE_IMPACT_LIMIT(),
        contract.RATE_LIMIT_INTERVAL(),
        contract.MAX_ACTIONS_IN_INTERVAL()
      ]);

      return {
        TOTAL_SUPPLY: formatEther(totalSupply),
        INITIAL_VIRTUAL_TOKEN_RESERVE: formatEther(initialVirtualTokenReserve),
        INITIAL_VIRTUAL_ETH_RESERVE: formatEther(initialVirtualEthReserve),
        MIGRATION_THRESHOLD: formatEther(migrationThreshold),
        MIGRATION_FEE: formatEther(migrationFee),
        MIN_PURCHASE: formatEther(minPurchase),
        MAX_PURCHASE: formatEther(maxPurchase),
        PRICE_IMPACT_LIMIT: Number(priceImpactLimit),
        RATE_LIMIT_INTERVAL: Number(rateLimitInterval),
        MAX_ACTIONS_IN_INTERVAL: Number(maxActionsInInterval)
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  return (
    <TokenContext.Provider
      value={{
        provider,
        address,
        connecting,
        contract,
        buy,
        withdrawPendingPayments,
        setEmergencyMode,
        withdrawFees,
        emergencyWithdraw,
        calculatePurchaseReturn,
        calculateSaleReturn,
        calculatePriceImpact,
        getBalance,
        getPendingWithdrawals,
        isMigrated,
        isEmergencyMode,
        getActionCounter,
        getLastActionTime,
        getConstants
      }}
    >
      {children}
    </TokenContext.Provider>
  );
}

export function useToken() {
  const context = useContext(TokenContext);
  if (!context) {
    throw new Error("useToken must be used within a TokenProvider");
  }
  return context;
}