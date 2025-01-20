const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy Factory
  const Factory = await ethers.getContractFactory("CypherPupsFactory");
  const factory = await Factory.deploy(
    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Uniswap Router
    "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f"  // Uniswap Factory
  );
  await factory.waitForDeployment();

  console.log("CypherPupsFactory deployed at:", await factory.getAddress());

  // Deploy a token via the factory
  console.log("Creating a CypherPup...");
  const tx = await factory.createCypherPups(deployer.address, "DOGGY", "DOG");
  const receipt = await tx.wait();

  // Parse the logs to extract the token address
  const event = receipt.logs
    .map(log => {
      try {
        return factory.interface.parseLog(log);
      } catch (err) {
        return null;
      }
    })
    .find(e => e && e.name === "CypherPupsDeployed");

  if (event) {
    const tokenAddress = event.args.tokenAddress;
    console.log("CypherPupsToken deployed at:", tokenAddress);

    // Interact with the deployed token
    const Token = await ethers.getContractAt("CypherPupsToken", tokenAddress);
    console.log("Token Name:", await Token.name());
    console.log("Token Symbol:", await Token.symbol());
  } else {
    console.error("CypherPupsDeployed event not found in logs.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

