"use client"

import { Search } from 'lucide-react'
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function HeroSection() {
  return (
    <div className="relative overflow-hidden border-b border-border/40">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent">
        <div className="absolute inset-0 noise-bg" />
      </div>
      <div className="container relative py-20">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col justify-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                Discover the Future of{" "}
                <span className="text-primary">Meme Trading</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Join the revolution with CypherPup. Trade, create, and explore the next generation of meme tokens.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  className="pl-10 h-12 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60" 
                  placeholder="Search tokens..." 
                />
              </div>
              <Button 
                size="lg" 
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                asChild
              >
                <Link href="/tokens/create">
                  Create Token
                </Link>
              </Button>
            </div>
          </div>
          <div className="hidden lg:block relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[140%]">
              <div className="relative aspect-square">
                <div className="absolute inset-0 bg-gradient-to-r from-background to-transparent z-10" />
                <Image
                  src="/placeholder.svg"
                  alt="CypherPup Illustration"
                  width={600}
                  height={600}
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

