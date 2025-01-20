const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { formatEther, toNumber } = require("ethers");
const { ethers } = require("hardhat");

describe("Token", function () {
    async function deployTokenFixture() {
        const [owner, taxWallet, devWallet, marketingWallet, liquidityWallet, user1, user2] = await ethers.getSigners();

        const Token = await ethers.getContractFactory("Token");
        const token = await Token.deploy(
            taxWallet.address,
            devWallet.address,
            marketingWallet.address,
            liquidityWallet.address
        );

        return {
            token,
            owner,
            taxWallet,
            devWallet,
            marketingWallet,
            liquidityWallet,
            user1,
            user2
        };
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { token, owner } = await loadFixture(deployTokenFixture);
            expect(await token.owner()).to.equal(owner.address);
        });

        it("Should initialize correctly", async function () {
            const { token, owner, taxWallet, devWallet, marketingWallet, liquidityWallet } = await loadFixture(deployTokenFixture);
            expect(await token.owner()).to.equal(owner.address);
            expect(await token._taxWallet()).to.equal(taxWallet.address);
            expect(await token._devWallet()).to.equal(devWallet.address);
            expect(await token._marketingWallet()).to.equal(marketingWallet.address);
            expect(await token._liquidityWallet()).to.equal(liquidityWallet.address);
        });

        it("Should have correct initial balances", async function () {
            const { token, devWallet, marketingWallet, liquidityWallet } = await loadFixture(deployTokenFixture);
            const totalSupply = await token.totalSupply();

            expect(await token.balanceOf(devWallet.address)).to.equal(totalSupply * BigInt(3) / BigInt(100));
            expect(await token.balanceOf(marketingWallet.address)).to.equal(totalSupply * BigInt(7) / BigInt(100));
            expect(await token.balanceOf(liquidityWallet.address)).to.equal(
                totalSupply - (await token.balanceOf(devWallet.address)) - (await token.balanceOf(marketingWallet.address))
            );
        });

        it("Should set correct limits", async function () {
            const { token } = await loadFixture(deployTokenFixture);

            const totalSupply = await token.totalSupply();
            expect(await token._maxTxAmount()).to.equal(totalSupply * BigInt(2) / BigInt(100));
            expect(await token._maxWalletSize()).to.equal(totalSupply * BigInt(2) / BigInt(100));
            expect(await token._taxSwapThreshold()).to.equal(totalSupply * BigInt(2) / BigInt(100));
            expect(await token._maxTaxSwap()).to.equal(totalSupply * BigInt(2) / BigInt(100));
        });

        it("Should have zero initial taxes", async function () {
            const { token } = await loadFixture(deployTokenFixture);
            expect(await token._BuyTax()).to.equal(0);
            expect(await token._SellTax()).to.equal(0);
        });
    });

    describe("Transactions", function () {
        it("Should transfer tokens between accounts", async function () {
            const { token, liquidityWallet, user1 } = await loadFixture(deployTokenFixture);
            const transferAmount = ethers.parseUnits("100", 9);

            await token.connect(liquidityWallet).transfer(user1.address, transferAmount);
            expect(await token.balanceOf(user1.address)).to.equal(transferAmount);
        });

        it("Should fail if sender doesn't have enough tokens", async function () {
            const { token, user1, user2 } = await loadFixture(deployTokenFixture);
            const initialBalance = await token.balanceOf(user1.address);

            await expect(
                token.connect(user1).transfer(user2.address, initialBalance + BigInt(1))
            ).to.be.revertedWith("SafeMath: subtraction overflow");
        });

        it("Should update balances after transfers", async function () {
            const { token, liquidityWallet, user1, user2 } = await loadFixture(deployTokenFixture);
            const transferAmount = ethers.parseUnits("100", 9);

            // First transfer: liquidityWallet -> user1
            await token.connect(liquidityWallet).transfer(user1.address, transferAmount);

            // Second transfer: user1 -> user2
            await token.connect(user1).transfer(user2.address, transferAmount / BigInt(2));

            expect(await token.balanceOf(user2.address)).to.equal(transferAmount / BigInt(2));
            expect(await token.balanceOf(user1.address)).to.equal(transferAmount / BigInt(2));
        });
        it("Should prevent transfers to contract address", async function () {
            const { token, liquidityWallet } = await loadFixture(deployTokenFixture);
            const amount = ethers.parseUnits("100", 9);

            await token.waitForDeployment();
            const tokenAddress = await token.getAddress();

            await expect(
                token.connect(liquidityWallet).transfer(tokenAddress, amount)
            ).to.be.revertedWith("You cannot send tokens to the contract");
        });

        it("Should enforce max transaction amount", async function () {
            const { token, liquidityWallet, user1, user2 } = await loadFixture(deployTokenFixture);
            await token.waitForDeployment();
            const tokenAddress = await token.getAddress();

            const maxTxAmount = await token._maxTxAmount();
            const overMaxAmount = maxTxAmount + BigInt(100000000);

            console.log(overMaxAmount);

            await token.connect(liquidityWallet).transfer(user1.address, overMaxAmount);

            await expect(
                token.connect(user1).transfer(user2.address, overMaxAmount)
            ).to.be.revertedWith("Exceeds the _maxTxAmount.");
        });

        it("Should enforce max wallet size", async function () {
            const { token, liquidityWallet, user1 } = await loadFixture(deployTokenFixture);
            await token.waitForDeployment();
            const tokenAddress = await token.getAddress();

            // Set up trading pair
            await token.setUniswapV2Pair(
                tokenAddress,
                await token.uniswapV2Router.WETH()
            );

            const maxWalletSize = await token._maxWalletSize();

            // Transfer from liquidity wallet (needs to be from uniswap pair)
            await expect(
                token.connect(liquidityWallet).transfer(user1.address, maxWalletSize + BigInt(1))
            ).to.be.revertedWith("Exceeds the maxWalletSize.");
        });

        it("Should handle burning correctly", async function () {
            const { token, user1, liquidityWallet } = await loadFixture(deployTokenFixture);
            const burnAmount = ethers.parseUnits("100", 9);

            await token.connect(liquidityWallet).transfer(user1.address, burnAmount);

            await token.connect(user1).burn(user1.address, burnAmount);

            expect(await token.balanceOf(user1.address)).to.equal(0);
            expect(await token._totalBurned()).to.equal(burnAmount);
        });
    });

    describe("Tax System", function () {
        it("Should allow tax wallet to reduce buy fees", async function () {
            const { token, taxWallet } = await loadFixture(deployTokenFixture);
            const newBuyFee = 500; // 5%

            await token.connect(taxWallet).reduceFees(newBuyFee);
            expect(await token._BuyTax()).to.equal(newBuyFee);
        });

        it("Should allow tax wallet to reduce sell fees", async function () {
            const { token, taxWallet } = await loadFixture(deployTokenFixture);
            const newSellFee = 500; // 5%

            await token.connect(taxWallet).reduceSellFees(newSellFee);
            expect(await token._SellTax()).to.equal(newSellFee);
        });

        it("Should not allow non-tax wallet to reduce fees", async function () {
            const { token, user1 } = await loadFixture(deployTokenFixture);
            const newFee = 500;

            await expect(
                token.connect(user1).reduceFees(newFee)
            ).to.be.reverted;

            await expect(
                token.connect(user1).reduceSellFees(newFee)
            ).to.be.reverted;
        });
    });

    describe("Admin Controls", function () {

        it("Should allow owner to set slippage", async function () {
            const { token, owner } = await loadFixture(deployTokenFixture);
            const newSlippage = 50;

            await token.connect(owner).setSlippage(newSlippage);
            expect(await token.slippage()).to.equal(newSlippage);
        });

        it("Should allow owner to remove limits", async function () {
            const { token, owner } = await loadFixture(deployTokenFixture);
            const totalSupply = await token.totalSupply();

            await token.connect(owner).removeLimits();
            expect(await token._maxTxAmount()).to.equal(totalSupply);
            expect(await token._maxWalletSize()).to.equal(totalSupply);
            expect(await token.transferDelayEnabled()).to.be.false;
        });

        it("Should allow owner to exclude from fee", async function () {
            const { token, owner, user1 } = await loadFixture(deployTokenFixture);
            const addresses = [user1.address];

            await token.connect(owner).excludeFromFee(addresses, true);
        });
    });

    describe("Bot Prevention", function () {
        it("Should allow owner to mark addresses as bots", async function () {
            const { token, owner, user1 } = await loadFixture(deployTokenFixture);

            await token.connect(owner).addBots([user1.address]);
            expect(await token.isBot(user1.address)).to.be.true;
        });

        it("Should prevent transfers from bot addresses", async function () {
            const { token, owner, liquidityWallet, user1, user2 } = await loadFixture(deployTokenFixture);
            const transferAmount = ethers.parseUnits("100", 9);

            await token.connect(liquidityWallet).transfer(user1.address, transferAmount);
            await token.connect(owner).addBots([user1.address]);

            await expect(
                token.connect(user1).transfer(user2.address, transferAmount)
            ).to.be.reverted;
        });
    });

    describe("Manual Swap", function () {
        it("Should allow tax wallet to execute manual swap", async function () {
            const { token, taxWallet } = await loadFixture(deployTokenFixture);

            await expect(token.connect(taxWallet).manualSwap())
                .to.not.be.reverted;
        });

        it("Should prevent non-tax wallet from executing manual swap", async function () {
            const { token, user1 } = await loadFixture(deployTokenFixture);

            await expect(
                token.connect(user1).manualSwap()
            ).to.be.reverted;
        });
    });
});

describe("Factory", function () {
    async function deployFactoryFixture() {
        const [owner, admin, deployer, user1, user2] = await ethers.getSigners();

        // Using mainnet addresses for DOGing
        const uniswapRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
        const uniswapFactory = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

        const Factory = await ethers.getContractFactory("CypherPupsFactory");
        const factory = await Factory.deploy(uniswapRouter, uniswapFactory);

        // Grant deployer role
        const DEPLOYER_ROLE = await factory.DEPLOYER_ROLE();
        await factory.grantRole(DEPLOYER_ROLE, deployer.address);

        return {
            factory,
            owner,
            admin,
            deployer,
            user1,
            user2,
            uniswapRouter,
            uniswapFactory
        };
    }

    describe("Deployment", function () {
        it("Should set the correct uniswap addresses", async function () {
            const { factory, uniswapRouter, uniswapFactory } = await loadFixture(deployFactoryFixture);

            expect(await factory.uniswapRouter()).to.equal(uniswapRouter);
            expect(await factory.uniswapFactory()).to.equal(uniswapFactory);
        });

        it("Should set the deployer of the contract as the default admin", async function () {
            const { factory, owner } = await loadFixture(deployFactoryFixture);

            const DEFAULT_ADMIN_ROLE = await factory.DEFAULT_ADMIN_ROLE();
            expect(await factory.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
        });

        it("Should revert if initialized with zero addresses", async function () {
            const { uniswapRouter, uniswapFactory } = await loadFixture(deployFactoryFixture);
            const Factory = await ethers.getContractFactory("CypherPupsFactory");

            await expect(
                Factory.deploy(ethers.ZeroAddress, uniswapFactory)
            ).to.be.revertedWithCustomError(Factory, "InvalidAddress");

            await expect(
                Factory.deploy(uniswapRouter, ethers.ZeroAddress)
            ).to.be.revertedWithCustomError(Factory, "InvalidAddress");
        });
    });

    describe("Token Creation", function () {
        it("Should allow deployer to create a new token", async function () {
            const { factory, deployer, admin } = await loadFixture(deployFactoryFixture);

            const tx = await factory.connect(deployer).createCypherPups(
                admin.address,
                "DOGGY",
                "DOG"
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.eventName === "CypherPupsDeployed");
            expect(event).to.not.be.undefined;

            const tokenAddress = event.args.tokenAddress;
            expect(await factory.isValidCypherPups(tokenAddress)).to.be.true;
        });

        it("Should set correct token parameters", async function () {
            const { factory, deployer, admin } = await loadFixture(deployFactoryFixture);

            const tx = await factory.connect(deployer).createCypherPups(
                admin.address,
                "CypherPups",
                "CPHP"
            );
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.eventName === "CypherPupsDeployed");
            const tokenAddress = event.args.tokenAddress;

            const token = await ethers.getContractAt("CypherPupsToken", tokenAddress);
            expect(await token.name()).to.equal("CypherPups");
            expect(await token.symbol()).to.equal("CPHP");

            const ADMIN_ROLE = await token.ADMIN_ROLE();
            expect(await token.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
        });

        it("Should revert if caller doesn't have deployer role", async function () {
            const { factory, user1, admin } = await loadFixture(deployFactoryFixture);

            await expect(
                factory.connect(user1).createCypherPups(
                    admin.address,
                    "DOGGY",
                    "DOG"
                )
            ).to.be.reverted;
        });

        it("Should revert with invalid admin address", async function () {
            const { factory, deployer } = await loadFixture(deployFactoryFixture);

            await expect(
                factory.connect(deployer).createCypherPups(
                    ethers.ZeroAddress,
                    "DOGGY",
                    "DOG"
                )
            ).to.be.revertedWithCustomError(factory, "InvalidAddress");
        });

        it("Should revert with empty name or symbol", async function () {
            const { factory, deployer, admin } = await loadFixture(deployFactoryFixture);

            await expect(
                factory.connect(deployer).createCypherPups(
                    admin.address,
                    "",
                    "DOG"
                )
            ).to.be.revertedWithCustomError(factory, "EmptyString");

            await expect(
                factory.connect(deployer).createCypherPups(
                    admin.address,
                    "DOGGY",
                    ""
                )
            ).to.be.revertedWithCustomError(factory, "EmptyString");
        });
    });

    describe("Token Validation", function () {
        it("Should validate created tokens correctly", async function () {
            const { factory, deployer, admin, user1 } = await loadFixture(deployFactoryFixture);

            const tx = await factory.connect(deployer).createCypherPups(
                admin.address,
                "DOGGY",
                "DOG"
            );
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.eventName === "CypherPupsDeployed");
            const tokenAddress = event.args.tokenAddress;

            // Valid token should return true
            expect(await factory.isValidCypherPupsToken(tokenAddress)).to.be.true;

            // Random address should return false
            expect(await factory.isValidCypherPupsToken(user1.address)).to.be.false;

            // Zero address should return false
            expect(await factory.isValidCypherPupsToken(ethers.ZeroAddress)).to.be.false;
        });
    });

    describe("Access Control", function () {
        it("Should manage roles correctly", async function () {
            const { factory, owner, user1 } = await loadFixture(deployFactoryFixture);

            const DEPLOYER_ROLE = await factory.DEPLOYER_ROLE();

            // Grant role
            await factory.connect(owner).grantRole(DEPLOYER_ROLE, user1.address);
            expect(await factory.hasRole(DEPLOYER_ROLE, user1.address)).to.be.true;

            // Revoke role
            await factory.connect(owner).revokeRole(DEPLOYER_ROLE, user1.address);
            expect(await factory.hasRole(DEPLOYER_ROLE, user1.address)).to.be.false;
        });

        it("Should prevent unauthorized role management", async function () {
            const { factory, user1, user2 } = await loadFixture(deployFactoryFixture);

            const DEPLOYER_ROLE = await factory.DEPLOYER_ROLE();

            await expect(
                factory.connect(user1).grantRole(DEPLOYER_ROLE, user2.address)
            ).to.be.reverted;
        });
    });
});

describe("CypherPupsToken", function () {
    async function deployTokenFixture() {
        const [owner, admin, user1, user2] = await ethers.getSigners();

        const uniswapRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
        const uniswapFactory = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

        const Token = await ethers.getContractFactory("CypherPupsToken");
        const token = await Token.deploy(
            uniswapRouter,
            uniswapFactory,
            admin.address,
            "DOGGY",
            "DOG"
        );

        return {
            token,
            owner,
            admin,
            user1,
            user2,
            uniswapRouter,
            uniswapFactory
        };
    }

    describe("Deployment", function () {
        it("Should revert with invalid addresses", async function () {
            const Token = await ethers.getContractFactory("CypherPupsToken");
            const [owner, admin] = await ethers.getSigners();

            await expect(Token.deploy(
                ethers.ZeroAddress,
                "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
                admin.address,
                "DOGGY",
                "DOG"
            )).to.be.revertedWithCustomError(Token, "InvalidAddress");

            await expect(Token.deploy(
                "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
                ethers.ZeroAddress,
                admin.address,
                "DOGGY",
                "DOG"
            )).to.be.revertedWithCustomError(Token, "InvalidAddress");

            await expect(Token.deploy(
                "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
                "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
                ethers.ZeroAddress,
                "DOGGY",
                "DOG"
            )).to.be.revertedWithCustomError(Token, "InvalidAddress");
        });

        it("Should set correct initial state", async function () {
            const { token } = await loadFixture(deployTokenFixture);

            expect(await token.virtualTokenReserve()).to.equal(await token.INITIAL_VIRTUAL_TOKEN_RESERVE());
            expect(await token.virtualEthReserve()).to.equal(await token.INITIAL_VIRTUAL_ETH_RESERVE());
            expect(await token.migrated()).to.be.false;
            expect(await token.emergencyMode()).to.be.false;
            expect(await token.totalCollectedETH()).to.equal(0);
        });

        it("Should set up roles correctly", async function () {
            const { token, admin } = await loadFixture(deployTokenFixture);

            const ADMIN_ROLE = await token.ADMIN_ROLE();
            const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();

            expect(await token.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
            expect(await token.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
        });
    });

    describe("Buying and Selling", function () {
        describe("Buy Function", function () {
            it("Should revert with invalid amounts", async function () {
                const { token, user1 } = await loadFixture(deployTokenFixture);

                await expect(token.connect(user1).buy({ value: 0 }))
                    .to.be.revertedWithCustomError(token, "InvalidAmount");

                const tooSmall = ethers.parseEther("0.009");
                await expect(token.connect(user1).buy({ value: tooSmall }))
                    .to.be.revertedWithCustomError(token, "InvalidAmount");

                const tooLarge = ethers.parseEther("51");
                await expect(token.connect(user1).buy({ value: tooLarge }))
                    .to.be.revertedWithCustomError(token, "ExceedsPriceImpact");
            });

            it("Should execute buy successfully", async function () {
                const { token, user1 } = await loadFixture(deployTokenFixture);
                const buyAmount = ethers.parseEther("0.01");

                await expect(token.connect(user1).buy({ value: buyAmount }))
                    .to.emit(token, "TokensPurchased")
                    .and.to.emit(token, "VirtualReservesUpdated");

                expect(await token.balanceOf(user1.address)).to.be.gt(0);
            });

            it("Should update reserves correctly", async function () {
                const { token, user1 } = await loadFixture(deployTokenFixture);
                const buyAmount = ethers.parseEther("0.01");

                const oldEthReserve = await token.virtualEthReserve();
                const oldTokenReserve = await token.virtualTokenReserve();

                await token.connect(user1).buy({ value: buyAmount });

                expect(await token.virtualEthReserve()).to.equal(oldEthReserve + buyAmount);
                expect(await token.virtualTokenReserve()).to.be.lt(oldTokenReserve);
            });
        });

        describe("Sell Function", function () {
            async function setupBuyAndSell() {
                const { token, user1 } = await loadFixture(deployTokenFixture);

                const buyAmount = ethers.parseEther("0.01");
                const buytx = await token.connect(user1).buy({ value: buyAmount });
                buytx.wait();

                const tokenBalance = await token.balanceOf(user1.address);

                const tokenAddress = await token.getAddress()

                await token.connect(user1).approve(tokenAddress, tokenBalance);


                const contractEthBalance = await ethers.provider.getBalance(tokenAddress);
                console.log("Contract ETH Balance:", formatEther(contractEthBalance).toString());

                return { token, user1, tokenBalance, contractEthBalance };
            }

            it("Should handle sells correctly", async function () {
                const { token, user1, tokenBalance } = await setupBuyAndSell();

                const expectedEthReturn = await token.calculateSaleReturn(tokenBalance);
                console.log("Expected ETH Return:", formatEther(expectedEthReturn).toString());

                const sellTx = await token.connect(user1).sell(tokenBalance);
                await sellTx.wait();

                expect(sellTx)
                    .to.emit(token, "TokensSold")
                    .withArgs(user1.address, tokenBalance, expectedEthReturn)
                    .to.emit(token, "WithdrawalQueued")
                    .withArgs(user1.address, expectedEthReturn);

                const userBalance = await token.balanceOf(user1.address);
                const pendingWithdrawal = await token.pendingWithdrawals(user1.address);

                expect(userBalance).to.equal(BigInt(0));
                expect(pendingWithdrawal).to.be.gt(0);
            });


            it("Should revert with insufficient balance", async function () {
                const { token, user1 } = await loadFixture(deployTokenFixture);
                const sellingAmount = ethers.parseUnits("1", 18); // 1 token

                await expect(token.connect(user1).sell(sellingAmount))
                    .to.be.revertedWithCustomError(token, "InsufficientBalance");
            });

            // it("Should verify price impact on sell", async function () {
            //     const { token, user1 } = await loadFixture(deployTokenFixture);

            //     const buyAmount = ethers.parseEther("4");
            //     console.log("Buy Amount:", formatEther(buyAmount).toString());
            //     const ethBalance = await ethers.provider.getBalance(user1.address);
            //     console.log("ETH Balance:", formatEther(ethBalance).toString());
            //     const buyTx = await token.connect(user1).buy({ value: buyAmount });
            //     await buyTx.wait();

            //     console.log("Buy Txn Hash:", buyTx.hash);

            //     const balance = await token.balanceOf(user1.address);
            //     console.log("Token balance: ", formatEther(balance).toString());

            //     const tokenAddress = await token.getAddress();
            //     await token.connect(user1).approve(tokenAddress, balance);
            //     const virtualTokenReserve = await token.virtualTokenReserve();

            //     console.log("Approved");
            //     console.log("Virtual Token Reserve:", formatEther(virtualTokenReserve).toString());

            //     const priceImpact = await token.calculatePriceImpact(balance, virtualTokenReserve);
            //     console.log("Price Impact:", priceImpact.toString());

            //     const totalSupply = await token.TOTAL_SUPPLY();
            //     console.log("Total Supply:", formatEther(totalSupply).toString());

            //     const PI = (Number(balance)/ Number(virtualTokenReserve) * Number(100));
            //     console.log(`(${formatEther(balance)} / ${formatEther(virtualTokenReserve)}) * ${100} = ${PI}`);
            //     console.log("PI: ", PI.toString());

            //     await expect(
            //         token.connect(user1).sell(balance)
            //     ).to.be.revertedWithCustomError(token, "ExceedsPriceImpact");
            // });

            it("Should queue withdrawal correctly after sell", async function () {
                const { token, user1, tokenBalance } = await setupBuyAndSell();

                await token.connect(user1).sell(tokenBalance);

                const pendingWithdrawal = await token.pendingWithdrawals(user1.address);
                expect(pendingWithdrawal).to.be.gt(0);

                await expect(token.connect(user1).withdrawPendingPayments())
                    .to.changeEtherBalance(user1, pendingWithdrawal);
            });

            it("Should update virtual reserves after sell", async function () {
                const { token, user1, tokenBalance } = await setupBuyAndSell();

                const beforeTokenReserve = await token.virtualTokenReserve();
                const beforeEthReserve = await token.virtualEthReserve();

                await token.connect(user1).sell(tokenBalance);

                expect(await token.virtualTokenReserve()).to.be.gt(beforeTokenReserve);
                expect(await token.virtualEthReserve()).to.be.lt(beforeEthReserve);
            });
        });
    });

    describe("Withdrawal System", function () {
        it("Should complete full buy-sell-withdraw cycle", async function () {
            const { token, user1 } = await loadFixture(deployTokenFixture);

            const buyAmount = ethers.parseEther("0.01");
            await token.connect(user1).buy({ value: buyAmount });

            const tokenBalance = await token.balanceOf(user1.address);

            await token.connect(user1).sell(tokenBalance);

            const pendingAmount = await token.pendingWithdrawals(user1.address);

            await expect(token.connect(user1).withdrawPendingPayments())
                .to.changeEtherBalance(user1, pendingAmount);

            expect(await token.balanceOf(user1.address)).to.equal(0);
            expect(await token.pendingWithdrawals(user1.address)).to.equal(0);
        });
    });

    describe("Rate Limiting", function () {
        it("Should enforce rate limits", async function () {
            const { token, user1 } = await loadFixture(deployTokenFixture);
            const amount = ethers.parseEther("0.01");

            for (let i = 0; i < 3; i++) {
                await token.connect(user1).buy({ value: amount });
            }

            await expect(token.connect(user1).buy({ value: amount }))
                .to.be.revertedWithCustomError(token, "ExceededRateLimit");
        });

        it("Should reset rate limit after interval", async function () {
            const { token, user1 } = await loadFixture(deployTokenFixture);
            const amount = ethers.parseEther("0.01");

            for (let i = 0; i < 3; i++) {
                await token.connect(user1).buy({ value: amount });
            }

            await ethers.provider.send("evm_increaseTime", [60]); // 1 minute
            await ethers.provider.send("evm_mine");

            await expect(token.connect(user1).buy({ value: amount }))
                .to.not.be.reverted;
        });
    });

    describe("Migration", function () {
        it("Should migrate correctly when threshold is met", async function () {
            const { token, user1 } = await loadFixture(deployTokenFixture);

            console.log(await token.getAddress());
            const largeAmount = ethers.parseEther("7");
            await token.connect(user1).buy({ value: largeAmount });

            expect(await token.migrated()).to.be.true;
            expect(await token.uniswapPair()).to.not.equal(ethers.ZeroAddress);
        });

        it("Should prevent operations after migration", async function () {
            const { token, user1 } = await loadFixture(deployTokenFixture);

            const largeAmount = ethers.parseEther("7");
            await token.connect(user1).buy({ value: largeAmount });

            await expect(token.connect(user1).buy({ value: ethers.parseEther("1") }))
                .to.be.revertedWithCustomError(token, "AlreadyMigrated");

            await expect(token.connect(user1).sell(1000))
                .to.be.revertedWithCustomError(token, "AlreadyMigrated");
        });
    });

    describe("Emergency Functions", function () {
        it("Should handle emergency mode correctly", async function () {
            const { token, admin } = await loadFixture(deployTokenFixture);

            await token.connect(admin).setEmergencyMode(true);
            expect(await token.emergencyMode()).to.be.true;
            expect(await token.paused()).to.be.true;

            await token.connect(admin).setEmergencyMode(false);
            expect(await token.emergencyMode()).to.be.false;
            expect(await token.paused()).to.be.false;
        });

        it("Should allow emergency withdrawal", async function () {
            const { token, admin, user1 } = await loadFixture(deployTokenFixture);

            await token.connect(user1).buy({ value: ethers.parseEther("0.01") });

            await token.connect(admin).setEmergencyMode(true);

            await expect(token.connect(admin).emergencyWithdraw())
                .to.changeEtherBalance(admin, await ethers.provider.getBalance(token.target));
        });
    });

    describe("Price Impact and Calculations", function () {
        it("Should calculate price impact correctly", async function () {
            const { token } = await loadFixture(deployTokenFixture);

            const tradeSize = ethers.parseEther("1");
            const reserve = ethers.parseEther("10");

            const impact = await token.calculatePriceImpact(tradeSize, reserve);
            expect(impact).to.equal(10);
        });

        it("Should enforce price impact limit", async function () {
            const { token, user1 } = await loadFixture(deployTokenFixture);

            const largeAmount = ethers.parseEther("40");
            await expect(token.connect(user1).buy({ value: largeAmount }))
                .to.be.revertedWithCustomError(token, "ExceedsPriceImpact");
        });
    });
})