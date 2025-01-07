"use client"
import Link from "next/link"
import { Flame, LineChart, Sparkles, TrendingUp } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { CategoryCard } from "@/components/category-card"
import { TokenGrid } from "@/components/token-grid"
import { Modal } from "@/components/modal"
import { TokenDeploymentForm } from "@/components/token-deployment-form"
import { useState } from "react"

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  return (
    <div className="w-full flex flex-col items-center justify-center">
      
      <div className="container py-12">
        <div className="grid gap-12">
          <section>
            <h2 className="text-2xl font-bold mb-6">Browse by Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <CategoryCard
                title="Trending"
                href="/tokens?sort=trending"
                icon={Flame}
                count={156}
              />
              <CategoryCard
                title="New Listings"
                href="/tokens?sort=new"
                icon={Sparkles}
                count={42}
              />
              <CategoryCard
                title="Top by Market Cap"
                href="/tokens?sort=marketcap"
                icon={TrendingUp}
                count={324}
              />
              <CategoryCard
                title="Highest Volume"
                href="/tokens?sort=volume"
                icon={LineChart}
                count={89}
              />
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Latest Tokens</h2>
              <div className="space-x-4">
                <Button variant="outline" asChild>
                  <Link href="/tokens">View All</Link>
                </Button>
                <Button onClick={() => setIsModalOpen(true)}>Create Token</Button>
              </div>
            </div>
            <TokenGrid limit={6} />
          </section>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Deploy New Token"
      >
        <TokenDeploymentForm onClose={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  )
}

