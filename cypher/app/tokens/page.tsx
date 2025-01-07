import { Metadata } from "next"
import { HeroSection } from "@/components/hero-section"
import { TokenGrid } from "@/components/token-grid"

export const metadata: Metadata = {
  title: "Browse Tokens | CypherPup",
  description: "Discover and trade the latest meme tokens on CypherPup.",
}

export default function TokensPage() {
  return (
    <div>
      <div className="container py-12">
        <div className="grid gap-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">All Tokens</h2>
            <TokenGrid />
          </section>
        </div>
      </div>
    </div>
  )
}

