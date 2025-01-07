"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2 } from 'lucide-react'

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useFactory } from "@/lib/provider"
// import { useToast } from "@/components/ui/use-toast"

const formSchema = z.object({
  name: z.string().min(3, {
    message: "Token name must be at least 3 characters.",
  }),
  symbol: z.string().min(2, {
    message: "Token symbol must be at least 2 characters.",
  }),
  admin: z.string().min(42, {
    message: "Admin address must be a valid Ethereum address.",
  }),
  initialSupply: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Initial supply must be a positive number.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
})

export function TokenDeploymentForm({ onClose }: { onClose: () => void }) {
  const [isDeploying, setIsDeploying] = useState(false)
  const { deployToken } = useFactory()
//   const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      symbol: "",
      admin:"",
      initialSupply: "",
      description: "",
      
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsDeploying(true)
    // Deploy token
    try {
        const tokenAddress = await deployToken({
            name: form.getValues().name,
            symbol: form.getValues().symbol,
            admin: form.getValues().admin
          })
          console.log("Token deployed at:", tokenAddress)
    } catch (error) {
        console.log(error)
    }
    

    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsDeploying(false)
    // toast({
    //   title: "Token Deployed!",
    //   description: `Successfully deployed ${values.name} (${values.symbol})`,
    // })
    onClose()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Token Name</FormLabel>
              <FormControl>
                <Input placeholder="CypherPup" {...field} />
              </FormControl>
              <FormDescription>
                The full name of your token.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="symbol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Token Symbol</FormLabel>
              <FormControl>
                <Input placeholder="CPUP" {...field} />
              </FormControl>
              <FormDescription>
                A short abbreviation for your token (usually 3-4 characters).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="admin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Creator</FormLabel>
              <FormControl>
                <Input placeholder="0x1a2b" {...field} />
              </FormControl>
              <FormDescription>
                The address of the person who created the token.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="initialSupply"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Initial Supply</FormLabel>
              <FormControl>
                <Input type="number" placeholder="1000000" {...field} />
              </FormControl>
              <FormDescription>
                The total number of tokens to create initially.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe your token and its purpose..." 
                  className="resize-none" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                A brief description of your token and its purpose.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isDeploying}>
          {isDeploying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isDeploying ? "Deploying..." : "Deploy Token"}
        </Button>
      </form>
    </Form>
  )
}

