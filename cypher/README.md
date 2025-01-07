# CypherPups Frontend

A modern, intuitive interface for the CypherPups token launchpad platform built with Next.js 14, shadcn/ui, and Tailwind CSS.


## Features

### Token Management
- 📊 Browse tokens by category (Trending, New Listings, Market Cap, Volume)
- 🔍 Advanced token search functionality
- 🚀 Token deployment wizard
- 📈 Real-time price charts and statistics

### Trading Interface
- 💱 Bonding curve-based trading
- 📉 Real-time price impact calculations
- 💰 Portfolio tracking
- 🔄 Transaction history

### Categories
- 🔥 Trending
- ✨ New Listing
- 📈 Top by Market Cap 
- 📊 Highest Volume

## Tech Stack

- **Framework**: Next.js 15
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Web3**: ethers.js v6
- **State Management**: React Context
- **Charts**: Recharts
- **Icons**: Lucide React

## Getting Started

```bash

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

## Environment Variables

```env
NEXT_PUBLIC_FACTORY_ADDRESS=
NEXT_PUBLIC_TOKEN_ADDRESS=
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx                 # Home page
│   ├── trade/                   # Trading interface
│   └── layout.tsx              # Root layout
├── components/
│   ├── ui/                     # shadcn components
│   ├── token-grid.tsx          # Token listing grid
│   ├── category-card.tsx       # Category cards
│   └── token-deployment-form.tsx # Token deployment
├── lib/
│   ├── provider.ts             # Factory provider
│   └── tokenProvider.ts        # Token provider
└── styles/
    └── globals.css             # Global styles
```

## Key Components

### TokenGrid
- Displays token listings
- Supports sorting and filtering
- Real-time price updates

### TokenDeploymentForm
- Token creation wizard
- Input validation
- Transaction status handling

### Trading Interface
- Buy/Sell functionality
- Price impact warnings
- Bonding curve visualization

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Adding New Features

1. Create component in `components/`
2. Add styles using Tailwind CSS
3. Import shadcn/ui components as needed
4. Update providers if required
5. Add to relevant page

## Web3 Integration

- Uses ethers.js v6 for blockchain interaction
- Providers handle contract interactions
- Automatic network detection
- Transaction error handling

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## Design Principles

- Dark mode by default
- Responsive design
- Intuitive navigation
- Clear error messages
- Loading states for all actions

## Optimizations

- Next.js App Router
- Dynamic imports
- Image optimization
- Memoized components
- Debounced search

## License

MIT License - see LICENSE for details