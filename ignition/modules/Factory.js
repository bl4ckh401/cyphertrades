// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { ethers } = require("hardhat");

const FEE = ethers.parseEther("0.01");

module.exports = buildModule("FactoryModule", (m) => {

    const fee = m.getParameter("fee", FEE);

    const factory = m.contract("CypherPupsFactory", [
        "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
        "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f"
    ])

})
