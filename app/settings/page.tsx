"use client";

import { useState, useEffect } from "react";
import CommonLayout from "@/components/common-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { WalletSettings, NotificationSettings } from "@/types/custom";
import { UserConfig } from "@/types/user-config";
import { apiClient } from "@/lib/api-client";
import AuthRequired from "@/components/auth-required";
import { useNearAuth } from "@/hooks/use-near-auth";
import { useRouter } from "next/navigation";
import { IntentsBalance } from "@/components/intents-balance";

export default function Settings() {
  const { toast } = useToast();
  const { accountId, logout } = useNearAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const router = useRouter();

  // Wallet settings state
  const [wallet, setWallet] = useState<WalletSettings>({
    address: "",
    privateKey: "",
  });

  // Notification settings state
  const [notifications, setNotifications] = useState<NotificationSettings>({
    telegramId: "",
    notifyOnSuccess: true,
    notifyOnFailure: true,
  });

  // Handle logout with confirmation
  const handleLogout = () => {
    if (confirm("Are you sure you want to log out?")) {
      logout();
      router.push('/');
    }
  };

  // Load user configuration on page load
  useEffect(() => {
    async function loadUserConfig() {
      try {
        setIsLoading(true);

        // Try to get existing user config
        try {
          const config = await apiClient.getUserConfig();
          setUserConfig(config);

          // Set wallet settings
          setWallet({
            address: config.wallet.address,
            privateKey: config.wallet.privateKey
          });

          // Set notification settings
          setNotifications({
            telegramId: config.notifications.telegramId || "",
            notifyOnSuccess: config.notifications.isTelegramEnabled,
            notifyOnFailure: config.notifications.isTelegramEnabled
          });
        } catch (error: any) {
          // If user config doesn't exist yet, pre-fill with NEAR account ID
          if (error.message?.includes("not found") && accountId) {
            setWallet(prev => ({
              ...prev,
              address: accountId
            }));
          } else {
            throw error;
          }
        }
      } catch (error) {
        console.error("Failed to load user configuration:", error);
        toast({
          title: "Error loading settings",
          description: "Failed to load your settings. Using defaults.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadUserConfig();
  }, [toast, accountId]);

  // Update wallet settings
  const updateWallet = (field: keyof WalletSettings, value: string) => {
    setWallet({ ...wallet, [field]: value });
  };

  // Update notification settings
  const updateNotifications = (field: keyof NotificationSettings, value: any) => {
    setNotifications({ ...notifications, [field]: value });
  };

  // Save wallet settings
  const saveWalletSettings = async () => {
    try {
      const updateData = {
        wallet: {
          address: wallet.address,
          privateKey: wallet.privateKey
        }
      };

      await apiClient.updateUserConfig(updateData);

      toast({
        title: "Wallet settings saved",
        description: "Your wallet has been connected successfully.",
      });
    } catch (error) {
      console.error("Error saving wallet settings:", error);
      toast({
        title: "Error",
        description: "Failed to save wallet settings. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Save notification settings
  const saveNotificationSettings = async () => {
    try {
      const updateData = {
        notifications: {
          telegramId: notifications.telegramId,
          isTelegramEnabled: notifications.notifyOnSuccess || notifications.notifyOnFailure,
          isEmailEnabled: false
        }
      };

      await apiClient.updateUserConfig(updateData);

      toast({
        title: "Notification settings saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (error) {
      console.error("Error saving notification settings:", error);
      toast({
        title: "Error",
        description: "Failed to save notification settings. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <AuthRequired>
      <CommonLayout title="Settings">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p>Loading your settings...</p>
          </div>
        ) : (
          <div className="space-y-8">


            {/* Account Info */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>👤 Account Information</CardTitle>
                <CardDescription>Your NEAR wallet account information</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Connected Account</p>
                    <p className="text-muted-foreground">{accountId || "Not connected"}</p>
                  </div>
                  <Button variant="destructive" onClick={handleLogout}>
                    Log Out
                  </Button>
                </div>
              </CardContent>

              <CardContent className="space-y-4">
                <IntentsBalance />
              </CardContent>

            </Card>


            {/* Wallet Settings */}
            <Card>
              <CardHeader>
                <CardTitle>🔑 Wallet Import</CardTitle>
                <CardDescription>Fill your NEAR wallet info to use with Shade Trader</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="wallet-address">Wallet Address</Label>
                  <Input
                    id="wallet-address"
                    value={wallet.address}
                    onChange={(e) => updateWallet("address", e.target.value)}
                    placeholder="example.near"
                  />
                </div>

                <div>
                  <Label htmlFor="private-key">Private Key</Label>
                  <Input
                    id="private-key"
                    type="password"
                    value={wallet.privateKey}
                    onChange={(e) => updateWallet("privateKey", e.target.value)}
                    placeholder="Enter your private key"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                  </p>
                </div>

                <Button onClick={saveWalletSettings}>Save Wallet Settings</Button>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle>🔔 Telegram Notification Setup</CardTitle>
                <CardDescription>Get notified when your orders execute</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="telegram-id">Telegram ID</Label>
                  <Input
                    id="telegram-id"
                    value={notifications.telegramId}
                    onChange={(e) => updateNotifications("telegramId", e.target.value)}
                    placeholder="Enter your Telegram ID"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Connect via our Telegram bot: <a className="text-blue-600 hover:underline" href="https://t.me/nearintents_bot" target="_blank" rel="noopener noreferrer">@nearintents_bot</a>
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="notify-success"
                    checked={notifications.notifyOnSuccess}
                    onCheckedChange={(checked) => updateNotifications("notifyOnSuccess", checked)}
                  />
                  <Label htmlFor="notify-success">Notify me on successful order execution</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="notify-failure"
                    checked={notifications.notifyOnFailure}
                    onCheckedChange={(checked) => updateNotifications("notifyOnFailure", checked)}
                  />
                  <Label htmlFor="notify-failure">Notify me on failed order execution</Label>
                </div>

                <Button onClick={saveNotificationSettings}>Save Notification Settings</Button>
              </CardContent>
            </Card>
          </div>
        )}


      </CommonLayout>
    </AuthRequired>
  );
}
