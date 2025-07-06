"use client";

import { useState } from "react";
import CommonLayout from "@/components/common-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Condition, TradeAction, OrderSettings } from "@/types/custom";
import { apiClient } from "@/lib/api-client";
import AuthRequired from "@/components/auth-required";
import { useWalletCheck } from "@/hooks/use-wallet-check";
import { useRouter } from "next/navigation";
import { IntentsBalance } from "@/components/intents-balance";

export default function CreateOrder() {
  const router = useRouter();
  const { isWalletConfigured, isLoading } = useWalletCheck();
  const { toast } = useToast();

  // Condition state
  const [conditions, setConditions] = useState<Condition[]>([{
    id: 1,
    token: "NEAR",
    metric: "Price",
    operator: "<",
    value: "3.00"
  }]);

  // Action state
  const [action, setAction] = useState<TradeAction>({
    type: "Buy",
    amount: "100",
    token: "NEAR"
  });

  // Settings state
  const [settings, setSettings] = useState<OrderSettings>({
    telegramNotification: true
  });

  // Add new condition (AND logic)
  const addCondition = () => {
    const newId = conditions.length > 0 ?
      Math.max(...conditions.map(c => c.id)) + 1 : 1;

    setConditions([
      ...conditions,
      {
        id: newId,
        token: "NEAR",
        metric: "Price",
        operator: "<",
        value: ""
      }
    ]);
  };

  // Remove condition
  const removeCondition = (id: number) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter(c => c.id !== id));
    }
  };

  // Update condition
  const updateCondition = (id: number, field: keyof Condition, value: string) => {
    setConditions(conditions.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  // Update action
  const updateAction = (field: keyof TradeAction, value: string) => {
    setAction({ ...action, [field]: value });
  };

  // Update settings
  const updateSettings = (field: keyof OrderSettings, value: any) => {
    setSettings({ ...settings, [field]: value });
  };

  // Submit order
  const submitOrder = () => {
    // Validate all conditions have values
    const invalidConditions = conditions.filter(c => !c.value || c.value.trim() === '');

    if (invalidConditions.length > 0) {
      toast({
        title: "Invalid condition values",
        description: "Please provide a valid number for all condition values.",
        variant: "destructive",
      });
      return;
    }

    // Validate BTC dominance range
    const invalidBtcDomCondition = conditions.find(c =>
      c.metric === "btc_dom" &&
      (parseFloat(c.value) < 10 || parseFloat(c.value) > 100)
    );

    if (invalidBtcDomCondition) {
      toast({
        title: "Invalid BTC Dominance value",
        description: "BTC Dominance must be between 10% and 100%.",
        variant: "destructive",
      });
      return;
    }

    // Validate action amount
    if (!action.amount || isNaN(parseFloat(action.amount)) || parseFloat(action.amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please provide a valid amount greater than zero.",
        variant: "destructive",
      });
      return;
    }

    // Prepare API request format
    const apiConditions = conditions.map(c => {
      // Convert market_cap from millions to actual value
      let value = c.value;
      if (c.metric.toLowerCase() === "market_cap" && value) {
        // Multiply by 1,000,000 to convert from millions
        const marketCapInMillions = parseFloat(value);
        value = (marketCapInMillions * 1000000).toString();
      }

      return {
        token: c.metric.toLowerCase() === "btc_dom" ? undefined : c.token,
        metric: c.metric.toLowerCase() as 'price' | 'btc_dom' | 'market_cap',
        operator: c.operator as '<' | '>' | '=' | '<=' | '>=',
        value
      };
    });

    const orderData = {
      conditions: apiConditions,
      action: {
        type: action.type,
        amount: action.amount,
        token: action.token
      },
      settings
    };

    // Show confirmation toast
    const { dismiss } = toast({
      title: "Confirm your order",
      description: (
        <div className="mt-2 space-y-2 text-sm">
          <p>
            <span className="font-bold">If:</span> {conditions.map((c, i) => {
              let valueWithUnit = c.value;
              if (c.metric === "btc_dom") {
                valueWithUnit += "%";
              } else if (c.metric === "market_cap") {
                valueWithUnit += "M";
              }

              return `${i > 0 ? ' AND ' : ''}${c.metric === "btc_dom" ? 'BTC Dominance' : c.token} ${c.metric === "btc_dom" ? '' : c.metric} ${c.operator} ${valueWithUnit}`;
            }).join('')}
          </p>
          <p>
            <span className="font-bold">Then:</span> {action.type === "Buy"
              ? `Buy ${action.token} with ${action.amount} USDT`
              : `Sell ${action.amount} ${action.token} for USDT`}
          </p>
          <div className="mt-2">
            <Button
              size="sm"
              className="mr-2"
              onClick={async () => {
                // Dismiss the confirmation toast first
                dismiss();

                try {
                  // Call the API to create the order
                  const result = await apiClient.createOrder(orderData);

                  // Show success notification
                  toast({
                    title: "Order created successfully",
                    description: `Your conditional order #${result.orderId} has been created and is now active.`,
                  });
                } catch (error) {
                  console.error("Error creating order:", error);
                  toast({
                    title: "Failed to create order",
                    description: "There was an error creating your order. Please try again.",
                    variant: "destructive"
                  });
                }
              }}
            >
              Confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // Close the toast
                dismiss();

                toast({
                  title: "Order cancelled",
                  description: "Your order was not submitted.",
                  variant: "destructive"
                });
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ),

    });
  };

  // Form submit handler
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    // Double-check wallet is configured before submitting
    if (!isWalletConfigured) {
      toast({
        title: "Wallet setup required",
        description: "Please configure your wallet with a VALID NEAR ADDRESS AND PRIVATE KEY before creating orders.",
        variant: "destructive"
      });
      router.push('/settings');
      return;
    }

    submitOrder();
  };

  return (
    <AuthRequired>
      <CommonLayout title="Create Conditional Order">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p>Checking wallet configuration...</p>
          </div>
        ) : !isWalletConfigured ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <p className="text-xl font-semibold">Wallet setup required</p>
            <p>You need to configure your wallet with a valid address and private key before creating orders.</p>
            <Button onClick={() => router.push('/settings')}>Go to Settings</Button>
          </div>
        ) : (
          <>
            {/* Conditions Section */}
            <Card className="mb-6 border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                  <span className="text-blue-700 dark:text-blue-300 font-bold text-sm">IF</span>
                </div>
                <CardTitle>When these conditions are met</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {conditions.map((condition) => (
                  <div key={condition.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-3 bg-muted/30 rounded-md">
                    {/* Hide Token selector when metric is btc_dom */}
                    {condition.metric !== "btc_dom" && (
                      <div>
                        <Label htmlFor={`token-${condition.id}`}>Crypto Asset</Label>
                        <Select
                          value={condition.token}
                          onValueChange={(value) => updateCondition(condition.id, "token", value)}
                        >
                          <SelectTrigger id={`token-${condition.id}`}>
                            <SelectValue placeholder="Select token" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NEAR">$NEAR</SelectItem>
                            <SelectItem value="ETH">$ETH</SelectItem>
                            <SelectItem value="BTC">$BTC</SelectItem>
                            <SelectItem value="DOGE">$DOGE</SelectItem>
                            <SelectItem value="XRP">$XRP</SelectItem>
                            <SelectItem value="ZEC">$ZEC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className={condition.metric === "btc_dom" ? "md:col-span-2" : ""}>
                      <Label htmlFor={`metric-${condition.id}`}>Metric</Label>
                      <Select
                        value={condition.metric}
                        onValueChange={(value) => {
                          // If switching to btc_dom, set token to BTC
                          if (value === "btc_dom") {
                            updateCondition(condition.id, "token", "BTC");
                          }
                          updateCondition(condition.id, "metric", value);
                        }}
                      >
                        <SelectTrigger id={`metric-${condition.id}`}>
                          <SelectValue placeholder="Select metric" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="price">Price</SelectItem>
                          <SelectItem value="market_cap">Market Cap</SelectItem>
                          <SelectItem value="btc_dom">BTC Dominance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className={condition.metric === "btc_dom" ? "md:col-span-1" : ""}>
                      <Label htmlFor={`operator-${condition.id}`}>Operator</Label>
                      <Select
                        value={condition.operator}
                        onValueChange={(value) => updateCondition(condition.id, "operator", value)}
                      >
                        <SelectTrigger id={`operator-${condition.id}`}>
                          <SelectValue placeholder="Select operator" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="<">Less than (&lt;)</SelectItem>
                          <SelectItem value=">">Greater than (&gt;)</SelectItem>
                          <SelectItem value="=">Equal to (=)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label htmlFor={`value-${condition.id}`}>
                          Value {condition.metric === "btc_dom" ? "(% of market)" : condition.metric === "market_cap" ? "(in millions)" : ""}
                        </Label>
                        <Input
                          id={`value-${condition.id}`}
                          value={condition.value}
                          type="number"
                          step="0.01"
                          min={condition.metric === "btc_dom" ? "10" : "0"}
                          max={condition.metric === "btc_dom" ? "100" : undefined}
                          onChange={(e) => {
                            // Validate float input
                            const value = e.target.value;
                            const floatValue = parseFloat(value);

                            // For btc_dom, ensure value is between 10 and 100
                            if (condition.metric === "btc_dom" && !isNaN(floatValue)) {
                              if (floatValue < 10) {
                                updateCondition(condition.id, "value", "10");
                                return;
                              } else if (floatValue > 100) {
                                updateCondition(condition.id, "value", "100");
                                return;
                              }
                            }

                            // Only update if it's a valid number or empty
                            if (value === "" || !isNaN(floatValue)) {
                              updateCondition(condition.id, "value", value);
                            }
                          }}
                          placeholder={
                            condition.metric === "btc_dom" ? "Enter 10-100" :
                              condition.metric === "market_cap" ? "e.g. 100 (million)" :
                                "e.g. 3.00"
                          }
                        />
                      </div>

                      {conditions.length > 1 && (
                        <Button
                          variant="destructive"
                          className="mt-auto"
                          onClick={() => removeCondition(condition.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                <Button variant="outline" onClick={addCondition} className="flex items-center gap-2">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 2.75C8 2.47386 7.77614 2.25 7.5 2.25C7.22386 2.25 7 2.47386 7 2.75V7H2.75C2.47386 7 2.25 7.22386 2.25 7.5C2.25 7.77614 2.47386 8 2.75 8H7V12.25C7 12.5261 7.22386 12.75 7.5 12.75C7.77614 12.75 8 12.5261 8 12.25V8H12.25C12.5261 8 12.75 7.77614 12.75 7.5C12.75 7.22386 12.5261 7 12.25 7H8V2.75Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
                  </svg>
                  Add another condition (AND)
                </Button>
              </CardContent>
            </Card>

            {/* Action Section */}
            <Card className="mb-6 border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full">
                  <span className="text-green-700 dark:text-green-300 font-bold text-sm">THEN</span>
                </div>
                <CardTitle>Execute this trade automatically</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-muted/30 rounded-md">
                  <div>
                    <Label htmlFor="action-type">Trade Type</Label>
                    <Select
                      value={action.type}
                      onValueChange={(value) => updateAction("type", value)}
                    >
                      <SelectTrigger id="action-type">
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Buy">Buy</SelectItem>
                        <SelectItem value="Sell">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="action-token">Token</Label>
                    <Select
                      value={action.token}
                      onValueChange={(value) => updateAction("token", value)}
                    >
                      <SelectTrigger id="action-token">
                        <SelectValue placeholder="Select token" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEAR">NEAR</SelectItem>
                        <SelectItem value="DOGE">DOGE</SelectItem>
                        <SelectItem value="XRP">XRP</SelectItem>
                        <SelectItem value="ZEC">ZEC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="action-amount">
                      {action.type === "Buy" ? "USDT Amount to Spend" : `${action.token} Amount to Sell`}
                    </Label>
                    <div className="relative">
                      <Input
                        id="action-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={action.amount}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Only update if it's a valid number or empty
                          if (value === "" || !isNaN(parseFloat(value))) {
                            updateAction("amount", value);
                          }
                        }}
                        className="pr-16"
                        placeholder={action.type === "Buy" ? "e.g. 100" : "e.g. 10"}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                        {action.type === "Buy" ? "USDT" : action.token}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Settings Section */}
            {/* <Card className="mb-6 border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full">
                  <span className="text-purple-700 dark:text-purple-300 font-bold text-sm">CONFIG</span>
                </div>
                <CardTitle>Order Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="telegram-notification"
                      checked={settings.telegramNotification}
                      onCheckedChange={(checked) => updateSettings("telegramNotification", checked)}
                    />
                    <Label htmlFor="telegram-notification">Send Telegram notification</Label>
                  </div>
                </div>
              </CardContent>
            </Card> */}

            {/* Order Summary Section */}
            <Card className="mb-6 bg-muted/20">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">IF</h3>
                    <div className="pl-4 space-y-2">
                      {conditions.map((condition, index) => (
                        <div key={condition.id} className="flex items-center gap-1 flex-wrap">
                          {index > 0 && <span className="font-bold">AND</span>}
                          {condition.metric === "btc_dom" ? (
                            <span className="bg-amber-500/10 px-2 py-1 rounded">BTC Dominance</span>
                          ) : (
                            <span className="bg-primary/10 px-2 py-1 rounded">${condition.token}</span>
                          )}
                          <span>{condition.metric === "btc_dom" ? "" : condition.metric}</span>
                          <span className="font-bold">{condition.operator}</span>
                          <span className="bg-primary/10 px-2 py-1 rounded">
                            {condition.metric === "market_cap" && parseFloat(condition.value) > 1000
                              ? (parseFloat(condition.value) / 1000).toFixed(2) + " Billion"
                              : (condition.metric === 'price' ? '$' : '') + condition.value + (condition.metric === "btc_dom" ? "%" : condition.metric === "market_cap" ? " M" : "")
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>


                  <div>
                    <h3 className="font-medium mb-2">THEN</h3>
                    <div className="pl-4">
                      <span className={action.type === "Buy" ? "bg-green-500/10 px-2 py-1 rounded" : "bg-red-500/10 px-2 py-1 rounded"}>
                        {action.type}
                      </span>
                      {action.type === "Buy" ? (
                        <>
                          <span className="ml-2">{action.amount} USDT worth of</span>
                          <span className="bg-primary/10 px-2 py-1 rounded ml-2">${action.token}</span>
                        </>
                      ) : (
                        <>
                          <span className="ml-2">{action.amount}</span>
                          <span className="bg-primary/10 px-2 py-1 rounded ml-2">${action.token}</span>
                          <span className="ml-2">for USDT</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* <div>
                    <h3 className="font-medium mb-2">SETTINGS</h3>
                    <div className="pl-4 space-y-1">
                      {settings.telegramNotification && (
                        <div className="flex items-center gap-1">
                          <span className="bg-blue-500/10 px-2 py-1 rounded">Telegram Notifications</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <span>Expires after</span>
                        <span className="bg-orange-500/10 px-2 py-1 rounded">7 days</span>
                      </div>
                    </div>
                  </div> */}
                  
                </div>
              </CardContent>
            </Card>


            <CardContent className="space-y-4">
              <IntentsBalance />
            </CardContent>

            {/* Create Order Button */}
            <div className="flex justify-center mt-8">
              <Button 
                size="lg" 
                onClick={handleCreateOrder}
                className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white font-medium px-8 py-2 rounded-full shadow-md hover:shadow-lg transition-all"
              >
                Create Automated Trade
              </Button>
            </div>
          </>
        )}
      </CommonLayout>
    </AuthRequired>
  );
}
