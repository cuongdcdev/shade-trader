"use client";

import { useState, useEffect } from "react";
import CommonLayout from "@/components/common-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { orderProcessor } from "@/lib/order-processor";

export default function OrderProcessorControl() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Get processor status on load
  useEffect(() => {
    function checkStatus() {
      try {
        const running = orderProcessor.isRunning();
        setIsRunning(running);
      } catch (error) {
        console.error('Error checking processor status:', error);
        toast({
          title: "Error",
          description: "Failed to get processor status",
          variant: "destructive"
        });
      }
    }
    
    checkStatus();
    
    // Poll status every 3 seconds
    const intervalId = setInterval(checkStatus, 3000);
    
    return () => clearInterval(intervalId);
  }, [toast]);
  
  // Control processor
  const controlProcessor = async (action: 'start' | 'stop') => {
    try {
      setIsLoading(true);
      
      if (action === 'start') {
        orderProcessor.start();
        toast({
          title: "Success",
          description: "Order processor started"
        });
      } else {
        orderProcessor.stop();
        toast({
          title: "Success",
          description: "Order processor stopped"
        });
      }
      
      // Update status
      setIsRunning(orderProcessor.isRunning());
    } catch (error) {
      console.error(`Error ${action}ing processor:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} processor`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <CommonLayout title="Order Processor Control">
      <Card>
        <CardHeader>
          <CardTitle>Order Processor Status</CardTitle>
          <CardDescription>Control the automatic order processor</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-medium">Status:</p>
              {isLoading ? (
                <p>Loading...</p>
              ) : (
                <Badge variant={isRunning ? "success" : "destructive"}>
                  {isRunning ? "Running" : "Stopped"}
                </Badge>
              )}
            </div>
            
            <div className="space-x-2">
              <Button 
                onClick={() => controlProcessor('start')}
                disabled={isLoading || isRunning === true}
                variant="default"
              >
                Start Processor
              </Button>
              
              <Button 
                onClick={() => controlProcessor('stop')}
                disabled={isLoading || isRunning !== true}
                variant="destructive"
              >
                Stop Processor
              </Button>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <h3 className="text-md font-medium mb-2">About the Order Processor</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Checks open orders every 30 seconds</li>
              <li>Fetches token data from CoinGecko</li>
              <li>Processes orders that meet all conditions</li>
              <li>Sends telegram notifications when orders execute</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </CommonLayout>
  );
}
