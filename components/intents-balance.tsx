"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Copy, ExternalLink, ArrowDownToLine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define the chain options for deposit
const DEPOSIT_ASSET_OPTIONS = [
  { id: "zec:mainnet", name: "ZCash (ZEC)", assetInfo: "ZEC on ZCash Network" },
  { id: "doge:mainnet", name: "Dogecoin (DOGE)", assetInfo: "DOGE on Dogecoin Network" },
  { id: "near:mainnet:near", name: "NEAR", assetInfo: "NEAR on NEAR Protocol" },
  { id: "near:mainnet:usdt", name: "USDT (NEAR)", assetInfo: "USDT on NEAR Protocol" },
  { id: "xrp:mainnet", name: "Ripple (XRP)", assetInfo: "XRP on XRP Ledger" },
];

export function IntentsBalance() {
  const [balances, setBalances] = useState<Array<{ symbol: string, balance: string, intents_token_id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<string>("near:mainnet:near");
  const [depositAddress, setDepositAddress] = useState<string>("");
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [activeTab, setActiveTab] = useState<"balance" | "deposit">("balance");
  const { toast } = useToast();

  const fetchIntentsBalance = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getIntentsBalance();
      setBalances(data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch Intents balance:", err);
      setError(err.message || "Failed to load Intents balance");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntentsBalance();
  }, []);

  const fetchDepositAddress = async (chain: string) => {
    try {
      setLoadingAddress(true);
      // Extract the base chain ID (remove the asset suffix if present)
      const baseChainId = chain.split(':').slice(0, 2).join(':');
      const address = await apiClient.getDepositAddress(baseChainId);
      setDepositAddress(address);
    } catch (err: any) {
      console.error("Failed to fetch deposit address:", err);
      toast({
        title: "Error fetching address",
        description: err.message || "Could not get deposit address. Please try again.",
        variant: "destructive",
      });
      setDepositAddress("");
    } finally {
      setLoadingAddress(false);
    }
  };

  useEffect(() => {
    if (selectedChain) {
      fetchDepositAddress(selectedChain);
    }
  }, [selectedChain]);

  const handleRefresh = async () => {
    try {
      await fetchIntentsBalance();
      toast({
        title: "Balance refreshed",
        description: "Your NEAR Intents balance has been updated.",
      });
    } catch (err) {
      toast({
        title: "Refresh failed",
        description: "Could not refresh your balance. Please try again.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: "Address copied to clipboard",
      });
    });
  };

  const getChainExplorer = (chain: string) => {
    // Extract the base chain ID (remove the asset suffix if present)
    const baseChainId = chain.split(':').slice(0, 2).join(':');
    
    switch (baseChainId) {
      case "zec:mainnet":
        return "https://explorer.zcha.in/addresses/";
      case "doge:mainnet":
        return "https://dogechain.info/address/";
      case "xrp:mainnet":
        return "https://xrpscan.com/account/";
      case "near:mainnet":
        return "https://explorer.near.org/accounts/";
      default:
        return "";
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 space-y-0">
        <div className="flex items-center space-x-4">
          <CardTitle className="text-base">NEAR Intents Balance</CardTitle>
          <div className="flex border rounded-md overflow-hidden">
            <button
              className={`px-3 py-1 text-sm font-medium ${activeTab === "balance" ? "bg-primary text-primary-foreground" : "bg-transparent hover:bg-muted/50"}`}
              onClick={() => setActiveTab("balance")}
            >
              Balances
            </button>
            <button
              className={`px-3 py-1 text-sm font-medium ${activeTab === "deposit" ? "bg-primary text-primary-foreground" : "bg-transparent hover:bg-muted/50"}`}
              onClick={() => setActiveTab("deposit")}
            >
              Deposit
            </button>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={loading}
          className="h-7 w-7 p-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </CardHeader>
      
      <CardContent className="p-0">
        {activeTab === "balance" && (
          <>
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground">
                <div className="flex items-center justify-center py-2">
                  <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                  Loading balances...
                </div>
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-destructive">{error}</div>
            ) : balances.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No tokens found in your Intents balance.</p>
            ) : (
              <div>
                <div className="grid grid-cols-2 px-4 py-2 text-xs font-medium text-muted-foreground border-b">
                  <div>TOKEN</div>
                  <div className="text-right">BALANCE</div>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {balances.map((item, index) => (
                    <div key={index} className="grid grid-cols-2 px-4 py-2 text-sm hover:bg-muted/50 transition-colors">
                      <div className="font-medium">{item.symbol}</div>
                      <div className="text-right">{parseFloat(item.balance).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        
        {activeTab === "deposit" && (
          <div className="p-4">
            <div className="mb-4">
              <label className="text-sm font-medium mb-1 block">Select Asset</label>
              <Select
                value={selectedChain}
                onValueChange={(value) => setSelectedChain(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  {DEPOSIT_ASSET_OPTIONS.map((asset) => (
                    <SelectItem key={`${asset.id}-${asset.name}`} value={asset.id}>
                      {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {loadingAddress ? (
              <div className="text-sm text-muted-foreground flex items-center justify-center py-4">
                <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                Loading deposit address...
              </div>
            ) : depositAddress ? (
              <div className="mt-4">
                <label className="text-sm font-medium mb-1 block">Your Deposit Address</label>
                <div className="mt-1 flex items-center gap-1">
                  <div className="bg-muted p-2 text-xs rounded flex-1 font-mono break-all">
                    {depositAddress}
                  </div>
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(depositAddress)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  {getChainExplorer(selectedChain) && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(getChainExplorer(selectedChain) + depositAddress, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                  <p className="font-medium mb-1">⚠️ Important Deposit Information</p>
                  <p className="text-xs">
                    <strong>Only send supported assets to this address.</strong> Sending unsupported assets may result in permanent loss.
                  </p>
                  <p className="text-xs mt-1">
                    <span className="font-medium">Currently depositing:</span> {DEPOSIT_ASSET_OPTIONS.find(a => a.id === selectedChain)?.assetInfo}
                  </p>
                </div>
                
                <p className="mt-3 text-xs text-muted-foreground">
                  <ArrowDownToLine className="inline h-3 w-3 mr-1" />
                  Send funds to this address to deposit into your NEAR-Intents account
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Failed to load deposit address. Please try selecting a different asset.</p>
            )}
          </div>
        )}
      </CardContent>
      
      <div className="p-4 border-t">
        <a href="https://app.near-intents.org/" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">
          🔗 Manage your balance on NEAR-Intents
        </a>
      </div>
    </Card>
  );
}