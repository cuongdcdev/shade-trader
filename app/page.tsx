"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import CommonLayout from "@/components/common-layout";

export default function Home() {
  return (
    <CommonLayout>
      <div className="py-10 md:py-16 lg:py-24 flex flex-col items-center text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
          🥷 Shade Trader - Automated Crypto Trading with NEAR Intents
        </h1>
        <p className="text-xl md:text-2xl mb-8 max-w-3xl text-muted-foreground">
          Create conditional limit orders to trade crypto automatically based on
          custom triggers like price thresholds, market indexes, or DCA strategies (soon).
        </p>
        <p className="text-md mb-8 max-w-3xl">Powered by NEAR-Intents 🪄, trustless & verifiable by NEAR's Shade Agent 🤖 </p>
        
        <div className="flex flex-col md:flex-row gap-4">
          <Button asChild size="lg">
            <Link href="/create">Create Order</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/open-orders">View Open Orders</Link>
          </Button>
        </div>
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="border rounded-lg p-6 text-left">
            <h3 className="text-lg font-semibold mb-2">🎯 Custom Conditions</h3>
            <p className="text-muted-foreground">Set trades to execute based on price thresholds, market indexes, Bitcoin dominance or anything you can imagine.</p>
          </div>

          <div className="border rounded-lg p-6 text-left">
            <h3 className="text-lg font-semibold mb-2">⚡ Automated Execution</h3>
            <p className="text-muted-foreground">Your orders execute automatically when conditions are met, no need to monitor the market.</p>
          </div>
          
          <div className="border rounded-lg p-6 text-left">
            <h3 className="text-lg font-semibold mb-2">🔗 Multiple Conditions</h3>
            <p className="text-muted-foreground">Why limit yourself with just one condition? Combine price thresholds, time constraints, and market indicators for sophisticated trading strategies.</p>
          </div>
          
          <div className="border rounded-lg p-6 text-left">
            <h3 className="text-lg font-semibold mb-2">🌐 Non-Smart Contract Chains</h3>
            <p className="text-muted-foreground">Trade on chains without smart contracts (ZEC, XRP, Doge) powered by NEAR-Intents technology.</p>
          </div>
          
          <div className="border rounded-lg p-6 text-left border-dashed">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold">🛡️ Protected by Shade Agent</h3>
              <span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full">Coming Soon</span>
            </div>
            <p className="text-muted-foreground">100% trustless & unstoppable! No more rug pulls or hacks—your trades run in secure TEE enclaves, verified on-chain, and operate 24/7 even if our servers go down. True crypto-native security.</p>
          </div>
          
          <div className="border rounded-lg p-6 text-left border-dashed">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold">📱 Telegram Notifications</h3>
              <span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full">Coming Soon</span>
            </div>
            <p className="text-muted-foreground">Get instant alerts about your orders via Telegram to stay updated on all your trading activities.</p>
          </div>

        </div>
      </div>
    </CommonLayout>
  );
}
