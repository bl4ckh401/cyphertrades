const { time } = require("@nomicfoundation/hardhat-network-helpers");

require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200, // Optimize for a balance between deployment cost and runtime execution
    },
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_URL || "https://base-sepolia.g.alchemy.com/v2/your-alchemy-url",
      accounts: [`0x${process.env.SEPOLIA_PRIVATE_KEY}`],
      timeout: 5*60*1000, // 5 minutes
    },
  },
  etherscan: {
    apiKey: process.env.BASESCAN_API,
  },
};
