"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFactory } from "@/lib/provider";

const formSchema = z.object({
  name: z.string().min(3, {
    message: "Token name must be at least 3 characters.",
  }),
  symbol: z.string().min(2, {
    message: "Token symbol must be at least 2 characters.",
  }),
  initialSupply: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Initial supply must be a positive number.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
});

export function TokenDeploymentForm({ onClose }: { onClose: () => void }) {
  const [isDeploying, setIsDeploying] = useState(false);
  const { deployToken, provider } = useFactory(); // Get provider from context
  const [connectedChain, setConnectedChain] = useState<string>("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      symbol: "",
      initialSupply: "",
      description: "",
    },
  });

  useEffect(() => {
    const getConnectedChain = async () => {
      const network = await provider?.getNetwork();
      setConnectedChain(`${network?.name} (Chain ID: ${network?.chainId})`);
    };

    getConnectedChain();
  }, [provider]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsDeploying(true);
    try {
      const signer = provider?.getSigner();
      const walletAddress = signer ? (await signer).address : "";
      const tokenAddress = await deployToken({
        name: values.name,
        symbol: values.symbol,
        admin: walletAddress!,
      });
      console.log("Token deployed at:", tokenAddress);
    } catch (error) {
      console.error("Error deploying token:", error);
    } finally {
      setIsDeploying(false);
      onClose();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <p>Connected to: {connectedChain || "Unknown"}</p>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Token Name</FormLabel>
              <FormControl>
                <Input placeholder="CypherPup" {...field} />
              </FormControl>
              <FormDescription>The full name of your token.</FormDescription>
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
  );
}
