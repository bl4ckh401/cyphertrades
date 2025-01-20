// scripts/deploy.ts
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy the token contract
  const Token = await ethers.getContractFactory("Token");
  
  // Setup wallet addresses
  const taxWallet = "0xA96FC7f6B95D59F015df5aa640097aBC9E46740f";
  const devWallet = "0xA96FC7f6B95D59F015df5aa640097aBC9E46740f";
  const marketingWallet = "0xF2543c69c148302e90eB2392Aa82541E9F14f199";
  const liquidityWallet = "0x87C56CC353B3323d097DFb1b9Ff82177272235C9";

  console.log("Starting deployment...");
  
  const token = await Token.deploy(
    taxWallet,
    devWallet,
    marketingWallet,
    liquidityWallet
  );

  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  console.log("Token deployed to:", tokenAddress);
  console.log("Name:", await token.name());
  console.log("Symbol:", await token.symbol());
  console.log("Total Supply:", (await token.totalSupply()).toString());

  console.log("\nDeployment Summary:");
  console.log("===================");
  console.log("Network:", network.name);
  console.log("Token Address:", tokenAddress);
  console.log("Tax Wallet:", taxWallet);
  console.log("Dev Wallet:", devWallet);
  console.log("Marketing Wallet:", marketingWallet);
  console.log("Liquidity Wallet:", liquidityWallet);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });