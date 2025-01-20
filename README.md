# Cypher Pups - Meme launchpad

## Technology Stack & Tools

- Solidity (Writing Smart Contracts & Tests)
- Javascript (Next.js & Testing)
- [Hardhat](https://hardhat.org/) (Development Framework)
- [Ethers.js](https://docs.ethers.io/v5/) (Blockchain Interaction)
- [Next.js](https://nextjs.org/) (Frontend Framework)


# CypherPups Platform

A decentralized platform for launching and trading tokens using bonding curve mechanics with automated Uniswap migration.

## Overview

CypherPups is a comprehensive token launchpad platform that combines bonding curve mechanics with automated market making. It features secure token deployment, fair price discovery, and guaranteed liquidity through automated Uniswap migration.

## Key Features

- 🔄 Bonding Curve Trading
- 🚀 Automated Uniswap Migration
- 🔒 Built-in Liquidity Locking
- ⏰ Time-locked Administration
- 🛡️ Advanced Security Features

## Smart Contracts

### Core Contracts

1. **CypherPupsToken** - Not official CPHP token, This is the token that will be issued to launchpad users
   - Implements bonding curve mechanics
   - Automated price discovery
   - Built-in Uniswap migration at threshold
   - Rate limiting and price impact protection

2. **CypherPupsFactory**
   - Token deployment factory
   - Role-based access control
   - Validation of deployed tokens

3. **CypherPupsLiquidityLock** - Coming Soon
   - LP token locking mechanism
   - Time-based unlocking
   - Lock ownership tracking

4. **CypherPupsTimelock** - Coming Soon
   - Administrative action delays
   - Transaction queueing and execution
   - Grace period management

## Technical Details

### Bonding Curve Mechanics - This is the CypherToken, Tokens that will be created to be issued to a creatoewhen they use cypher pup to launch

The platform uses a customized bonding curve formula:
- Initial virtual reserve: 1.06e27 tokens, 1.6 ETH
- Price calculation based on constant product formula (k = x * y)
- Maximum trade size: 50 ETH
- Price impact limit: 10%

### Security Features

- Reentrancy protection
- Rate limiting (3 actions per minute)
- Price impact limits
- Emergency mode
- Role-based access
- Queued withdrawals


## Frontend

The platform features a modern, user-friendly interface built with:
- Next.js 15
- shadcn/ui components
- Ethers.js v6
- Tailwind CSS

Key UI Features:
- Real-time price charts(Coming soon)
- Trade execution interface
- Token deployment wizard
- Portfolio management
- Transaction history
- Wallet connection

## Development

### Prerequisites

```bash
node >= 20.0.0
npm >= 9.0.0
hardhat
```

### Installation

```bash
# Clone the repository
git clone https://github.com/bl4ckh401/cyphertrades.git

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
```

### Local Development

```bash
# Start local hardhat node
npx hardhat node

# Deploy contracts
npx hardhat run scripts/Deploy.js --network sepolia

# Start frontend
npm run dev
```

### Testing

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/CypherPupsToken.js
```

### Deployment

```bash
# Deploy to testnet (Sepolia)
npx hardhat run scripts/Deploy.js --network sepolia

# Deploy to mainnet
npx hardhat run scripts/Deploy.js --network mainnet
```

## Contract Addresses

### Mainnet
- Factory: `[TBD]`
- Router: `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D`
- UniswapFactory: `0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f`

### Testnet (Sepolia)
- Factory: `[TBD]`

## Security

- All contracts are thoroughly tested
- Custom error handling for better gas efficiency
- Emergency controls for risk mitigation
- Time-locked administration
- Anti-bot measures implemented

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.