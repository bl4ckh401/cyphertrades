import Image from "next/image"
import Link from "next/link"

interface TokenCardProps {
  token: {
    id: string;
  address: string;
  owner: string;
  name: string;
  symbol: string;
  marketCap: string;
  volume: string;
  price: number;
  change24h?: number;
  description?: string;
  imageUrl?: string;
  }
}

export function TokenCard({ token }: TokenCardProps) {
  return (
    <Link
      href={`/trade?token=${token.address}`}
      className="group relative overflow-hidden rounded-lg border border-border/40 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 transition-all hover:border-primary/40 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)_/_0.2)]"
    >
      <div className="flex items-start gap-4">
        {token.imageUrl && (
          <Image
          src={token.imageUrl || ""}
          alt={token.name}
          width={48}
          height={48}
          className="rounded-lg"
        />)
        }
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold truncate">{token.name}</h3>
              <h5 className="font-semibold truncate">{token.address}</h5>
              <p className="text-sm text-muted-foreground">
                ${token.symbol}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium">${token.price.toLocaleString()}</p>
              <p className={`text-sm ${
                token.change24h! >= 0 ? "text-green-500" : "text-red-500"
              }`}>
                {token.change24h! > 0 ? "+" : ""}
                {token.change24h}%
              </p>
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{token.description}</p>
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <div>
              <span className="block text-xs uppercase">Market Cap</span>
              ${token.marketCap}
            </div>
            <div>
              <span className="block text-xs uppercase">Volume</span>
              ${token.volume}
            </div>
            {/* <div>
              <span className="block text-xs uppercase">Created</span>
              {token.createdAt}
            </div> */}
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  )
}

