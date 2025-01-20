// lib/tokenProvider.ts
import { createContext, useContext, useEffect, useState } from "react"
import { BrowserProvider, Contract, formatEther, parseEther, parseUnits } from "ethers"
import { TokenContextType } from "./types";
import tokenABI from "../abis/TOKENABI.json"


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
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeProviderAndContract = async () => {
      try {
        if (!window.ethereum) throw new Error("MetaMask is not installed");

        try {
          const provider = new BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          let tokenContract: any;
          console.log("Accounts: ", accounts)

          if (accounts.length > 0) {
            const signer = await provider.getSigner();
            console.log("Signer: ", signer.address)
            setProvider(provider);
            setAddress(signer.address);
            console.log("Address: ", signer.address)

            console.log("Token Address: ", { tokenAddress })
            tokenContract = new Contract(tokenAddress, tokenABI, signer);
            console.log("Token Contract: ", tokenContract)
          }


          setContract(tokenContract);
        } catch (error) {
          console.error("Failed to initialize provider and contract:", error);
        }finally {
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to check wallet connection:", error);
      }
    }

    initializeProviderAndContract();
  }, [tokenAddress]);

  const handleError = (error: any) => {
    console.error("Error:", error);
    alert(error.message || "An unexpected error occurred");
  };

  const buy = async (ethAmount: string) => {
    if (!contract) throw new Error("Contract not initialized");

    try {
      console.log("Attempting to buy with: ", ethAmount);
      const parsedAmount = parseEther(ethAmount);
      console.log("Parsed Amount (in wei): ", parsedAmount.toString());

      const tx = await contract.buy({ value: parsedAmount });
      console.log("Transaction Sent: ", tx);

      const receipt = await tx.wait();
      console.log("Transaction Confirmed: ", receipt);

      alert(`Successfully bought tokens for ${ethAmount} ETH`);
    } catch (error: any) {
      console.error("Buy Function Error: ", error);
      alert(`Error occurred: ${error.message}`);
    }
  };


  const sell = async (tokenAmount: string) => {
    if (!contract) throw new Error("Contract not initialized");

    try {
      console.log("Attempting to sell: ", tokenAmount);
      const parsedAmount = parseUnits(tokenAmount, 18);
      console.log("Parsed Amount (in wei): ", parsedAmount.toString());

      const tx = await contract.sell(parsedAmount);
      console.log("Transaction Sent: ", tx);

      const receipt = await tx.wait();
      console.log("Transaction Confirmed: ", receipt);

      alert(`Successfully sold ${tokenAmount} tokens`);
    } catch (error: any) {
      console.error("Sell Function Error: ", error);
      alert(`Error occurred: ${error.message}`);
    }
  }


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
      const tokenAmountInWei = parseUnits(tokenAmount, 18);
      console.log(tokenAmountInWei.toString())
  
      const result = await contract.calculateSaleReturn(tokenAmountInWei);
      console.log("Sale Return: ", formatEther(result))
  
      return formatEther(result);
    } catch (error) {
      console.error("Error calculating sale return:", error);
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

  const getBalance = async (address?: string) => {
    if (!contract) return "0";
    try {
      const balance = await contract.balanceOf(address);
      return formatEther(balance);
    } catch (error) {
      console.error(error);
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


  const getTokenInfo = async (): Promise<{ name: string; symbol: string, totalSupply: number, decimals: number, virtualEthReserve:number, totalCollectedETH:number, virtualTokenReserve:number }> => {
    if (!contract) throw new Error("Contract not initialized");
    try {
      const [name, symbol, totalSupply, decimals, virtualEthReserve, totalCollectedETH, virtualTokenReserve] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.totalSupply(),
        contract.decimals(),
        contract.virtualEthReserve(),
        contract.totalCollectedETH(),
        contract.virtualTokenReserve()

      ]);

      console.log(formatEther(virtualTokenReserve))

      return { name, symbol, totalSupply, decimals, virtualEthReserve, totalCollectedETH, virtualTokenReserve };
    } catch (error) {
      handleError(error);
      throw error;
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
        loading,
        buy,
        sell,
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
        getConstants,
        getTokenInfo
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