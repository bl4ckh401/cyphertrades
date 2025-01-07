import { TypeIcon as type, LucideIcon } from 'lucide-react'
import Link from "next/link"

interface CategoryCardProps {
  title: string
  href: string
  icon: LucideIcon
  count: number
}

export function CategoryCard({ title, href, icon: Icon, count }: CategoryCardProps) {
  return (
    <Link 
      href={href} 
      className="group relative overflow-hidden rounded-lg border border-border/40 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6 transition-all hover:border-primary/40 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)_/_0.2)]"
    >
      <div className="relative z-10">
        <Icon className="h-8 w-8 mb-3 text-primary" />
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{count.toLocaleString()} tokens</p>
      </div>
      <div className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/2 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
    </Link>
  )
}

