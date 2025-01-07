"use client"
import { createContext, useContext, useEffect, useState } from "react"

declare global {
  interface Window {
    ethereum?: any;
  }
}
import { BrowserProvider, Contract, formatEther, parseEther } from "ethers"

const FACTORY_ABI = [
  "function createCypherPups(address admin, string name, string symbol) external returns (address)",
  "function isValidCypherPupsToken(address tokenAddress) external view returns (bool)",
  "function DEPLOYER_ROLE() external view returns (bytes32)",
  "function uniswapRouter() external view returns (address)",
  "function uniswapFactory() external view returns (address)",
  "event CypherPupsDeployed(address indexed tokenAddress, address indexed owner)"
];

interface FactoryContextType {
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
  getDeployerRole: () => Promise<string>;
  getUniswapAddresses: () => Promise<{
    router: string;
    factory: string;
  }>;
  
  getDeployedTokens: () => Promise<Array<{
    address: string;
    owner: string;
    timestamp: number;
  }>>;
}

const FactoryContext = createContext<FactoryContextType | null>(null);

export function FactoryProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [factoryContract, setFactoryContract] = useState<Contract | null>(null);



  const initializeContract = async (signer: any) => {
    try {
      const contract = new Contract(
        process.env.NEXT_PUBLIC_FACTORY_ADDRESS!,
        FACTORY_ABI,
        signer
      );
      setFactoryContract(contract);
    } catch (error) {
      console.error("Failed to initialize factory contract:", error);
      throw error;
    }
  };

  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const provider = new BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          
          if (accounts.length > 0) {
            const signer = await provider.getSigner();
            setProvider(provider);
            setAddress(await signer.getAddress());
            await initializeContract(signer);
          }
        } catch (error) {
          console.error("Failed to check wallet connection:", error);
        }
      }
    };

    checkConnection();
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      console.log("Wallet not found");
      // toast({
      //   title: "Wallet not found",
      //   description: "Please install MetaMask or another Web3 wallet",
      //   variant: "destructive",
      // });
      return;
    }

    try {
      setConnecting(true);
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      
      setProvider(provider);
      setAddress(await signer.getAddress());
      await initializeContract(signer);

      // toast({
      //   title: "Connected",
      //   description: "Wallet connected successfully",
      // });
    } catch (error: any) {
      console.error(error);
      // toast({
      //   title: "Connection failed",
      //   description: error.message,
      //   variant: "destructive",
      // });
    } finally {
      setConnecting(false);
    }
  };

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', async (accounts: string[]) => {
        if (accounts.length > 0) {
          const provider = new BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          setProvider(provider);
          setAddress(accounts[0]);
          await initializeContract(signer);
        } else {
          setProvider(null);
          setAddress(null);
          setFactoryContract(null);
        }
      });

      return () => {
        window.ethereum.removeListener('accountsChanged', () => {});
      };
    }
  }, []);

  const deployToken = async ({ name, symbol, admin }: { 
    name: string;
    symbol: string;
    admin: string;
  }): Promise<string> => {
    if (!factoryContract) throw new Error("Factory contract not initialized");

    try {
      const tx = await factoryContract.createCypherPups(admin, name, symbol);
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(
        (log: any) => log.eventName === "CypherPupsDeployed"
      );
      
      if (!event) throw new Error("Deployment event not found");
      
      const tokenAddress = event.args.tokenAddress;
      
      // toast({
      //   title: "Success",
      //   description: `Token deployed at ${tokenAddress}`,
      // });
      
      return tokenAddress;
    } catch (error: any) {
      // toast({
      //   title: "Deployment failed",
      //   description: error.message,
      //   variant: "destructive",
      // });
      throw error;
    }
  };

  const isValidToken = async (tokenAddress: string): Promise<boolean> => {
    if (!factoryContract) return false;
    try {
      return await factoryContract.isValidCypherPupsToken(tokenAddress);
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const getDeployerRole = async (): Promise<string> => {
    if (!factoryContract) throw new Error("Factory contract not initialized");
    try {
      return await factoryContract.DEPLOYER_ROLE();
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const getUniswapAddresses = async (): Promise<{ router: string; factory: string }> => {
    if (!factoryContract) throw new Error("Factory contract not initialized");
    try {
      const [router, factory] = await Promise.all([
        factoryContract.uniswapRouter(),
        factoryContract.uniswapFactory()
      ]);
      return { router, factory };
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const getDeployedTokens = async (): Promise<Array<{
    address: string;
    owner: string;
    timestamp: number;
  }>> => {
    if (!factoryContract) return [];
    try {
      // Get all past CypherPupsDeployed events
      const filter = factoryContract.filters.CypherPupsDeployed();
      const events = await factoryContract.queryFilter(filter);
      
      const deployments = await Promise.all(
        events.map(async (event: any) => {
          const block = await event.getBlock();
          return {
            address: event.args.tokenAddress,
            owner: event.args.owner,
            timestamp: Number(block.timestamp)
          };
        })
      );

      return deployments.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  return (
    <FactoryContext.Provider
      value={{
        provider,
        address,
        connecting,
        factoryContract,
        connectWallet,
        deployToken,
        isValidToken,
        getDeployerRole,
        getUniswapAddresses,
        getDeployedTokens,
      }}
    >
      {children}
    </FactoryContext.Provider>
  );
}

export function useFactory() {
  const context = useContext(FactoryContext);
  if (!context) {
    throw new Error("useFactory must be used within a FactoryProvider");
  }
  return context;
}