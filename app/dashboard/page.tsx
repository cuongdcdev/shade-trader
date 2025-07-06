"use client";

import { useState, useEffect, ChangeEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CommonLayout from "@/components/common-layout";
import { Order } from "@/types/custom";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Helper function for formatting numbers
const formatNumber = (value: string | number, metric?: string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return String(value);
  
  // Handle currency values
  if (metric === "price") {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(num);
  }
  
  // Handle percentage values
  if (metric === "btc_dom") {
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 }) + "%";
  }
  
  // Handle large numbers (millions/billions)
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 }) + " Bil";
  }
  
  if (num >= 1_000_000) {
    return (num / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 }) + " Mil";
  }
  
  // Regular number formatting
  return num.toLocaleString('en-US', { maximumFractionDigits: 6 });
};

// Format the condition string for better readability
const formatCondition = (condition: any): string => {
  const metricDisplay = condition.metric === "btc_dom" 
    ? "BTC Dominance" 
    : condition.metric === "price" 
      ? "price" 
      : condition.metric === "market_cap" 
        ? "market cap" 
        : condition.metric;
  
  const tokenDisplay = condition.metric === "btc_dom" ? "" : condition.token;
  
  const formattedValue = formatNumber(condition.value, condition.metric);
  
  return `${tokenDisplay} ${metricDisplay} ${condition.operator} ${formattedValue}`;
};

// Normalize status value to ensure consistent casing
const normalizeStatus = (status: string): 'Open' | 'Executed' | 'Cancelled' => {
  if (!status) return 'Open'; // Default fallback for empty values
  
  const statusLower = status.toLowerCase();
  
  if (statusLower === 'open') return 'Open';
  if (statusLower === 'executed') return 'Executed';
  if (statusLower === 'cancelled' || statusLower === 'canceled') return 'Cancelled';
  
  // Default fallback
  return status as 'Open' | 'Executed' | 'Cancelled';
};

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [sortConfig, setSortConfig] = useState({
    key: 'createdAt',
    direction: 'desc' as 'asc' | 'desc'
  });
  const [searchQuery, setSearchQuery] = useState('');
  
  // New state for filters
  const [filters, setFilters] = useState({
    token: "all",
    status: "all"
  });
  
  // Get unique tokens from orders for the token filter
  const availableTokens = Array.from(new Set(orders.map(order => order.token)));
  
  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getUserOrders();
        
        // Debug API response
        console.log("Raw API order response:", response.orders);
        
        const transformedOrders = response.orders.map(apiOrder => {
          // Make sure to normalize the status consistently
          const normalizedStatus = normalizeStatus(apiOrder.status);
          
          return {
            id: apiOrder.orderId,
            token: apiOrder.action.token,
            action: `${apiOrder.action.type} ${formatNumber(apiOrder.action.amount)} ${apiOrder.action.token}`,
            trigger: apiOrder.conditions.map(c => formatCondition(c)).join(' AND '),
            status: normalizedStatus,
            createdAt: apiOrder.createdAt,
            // Add a mock transaction hash for executed orders
            txHash: normalizedStatus === 'Executed' ? apiOrder?.txHash : null
          };
        });
        
        setOrders(transformedOrders);
        console.log("Transformed orders with statuses:", transformedOrders.map(o => o.status));
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast({
          title: "Failed to load orders",
          description: "There was an error loading your orders. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrders();
  }, [toast]);
  
  // Update the refresh function to properly handle txHash
  const refreshOrders = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getUserOrders();
      
      const transformedOrders = response.orders.map(apiOrder => {
        // Normalize status to ensure consistent casing
        const normalizedStatus = normalizeStatus(apiOrder.status);
        
        return {
          id: apiOrder.orderId,
          token: apiOrder.action.token,
          action: `${apiOrder.action.type} ${formatNumber(apiOrder.action.amount)} ${apiOrder.action.token}`,
          trigger: apiOrder.conditions.map(c => formatCondition(c)).join(' AND '),
          status: normalizedStatus,
          createdAt: apiOrder.createdAt,
          // Make sure to get the txHash from the API response directly
          txHash: apiOrder.txHash || null
        };
      });
      
      setOrders(transformedOrders);
      toast({
        title: "Orders refreshed",
        description: "Your orders have been refreshed.",
      });
    } catch (error) {
      console.error("Error refreshing orders:", error);
      toast({
        title: "Failed to refresh orders",
        description: "There was an error refreshing your orders. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      token: "all",
      status: "all"
    });
    setSearchQuery('');
  };
  
  // Cancel order
  const cancelOrder = async (id: string) => {
    try {
      await apiClient.cancelOrder(id);
      
      setOrders(orders.map(order => 
        order.id === id ? {...order, status: 'Cancelled' as const} : order
      ));
      
      toast({
        title: "Order cancelled",
        description: `Order #${id} has been cancelled successfully.`,
      });
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast({
        title: "Failed to cancel order",
        description: "There was an error cancelling your order. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Log filter changes for debugging
  useEffect(() => {
    console.log("Filters changed:", filters);
  }, [filters]);

  // Filter orders based on search query and dropdown filters
  const filteredOrders = orders.filter(order => {
    // Apply token filter
    if (filters.token !== "all" && order.token !== filters.token) {
      return false;
    }
    
    // Apply status filter - using explicit comparison with proper normalization
    if (filters.status !== "all") {
      // Don't re-normalize if already normalized in the order object
      if (order.status !== filters.status) {
        return false;
      }
    }
    
    // Apply search query
    if (searchQuery !== '') {
      return (
        order.token.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.trigger && order.trigger.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    return true;
  });

  // Sort orders
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortConfig.key === 'createdAt') {
      return sortConfig.direction === 'asc' 
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortConfig.key === 'token' || sortConfig.key === 'action' || sortConfig.key === 'status') {
      const aValue = a[sortConfig.key] || '';
      const bValue = b[sortConfig.key] || '';
      return sortConfig.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    return 0;
  });

  // Request sort
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  return (
    <CommonLayout title="My Dashboard">
      <div className="flex flex-col md:flex-row justify-between items-start mb-6">
        <p className="text-muted-foreground mb-4 md:mb-0">Manage your automated trading orders</p>
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <Button asChild>
            <Link href="/create">Create New Order</Link>
          </Button>
        </div>
      </div>
      
      {/* Filters Section */}
      <div className="mb-6 p-4 bg-muted rounded-lg">
        <h3 className="text-lg font-medium mb-3">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="token-filter" className="mb-2 block">Token</Label>
            <Select
              value={filters.token}
              onValueChange={(value) => setFilters({...filters, token: value})}
            >
              <SelectTrigger id="token-filter" className="w-full">
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tokens</SelectItem>
                {availableTokens.map(token => (
                  <SelectItem key={token} value={token}>{token}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="status-filter" className="mb-2 block">Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({...filters, status: value})}
            >
              <SelectTrigger id="status-filter" className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="Executed">Executed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="search-input" className="mb-2 block">Search</Label>
            <Input 
              id="search-input"
              placeholder="Search orders..." 
              value={searchQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-end space-x-2">
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="mb-0 flex-1"
            >
              Clear Filters
            </Button>
            <Button 
              variant="outline" 
              onClick={refreshOrders}
              className="mb-0 flex-1"
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>
      
      <div className="rounded-md border">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th 
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer"
                  onClick={() => requestSort('token')}
                >
                  Token {sortConfig.key === 'token' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer"
                  onClick={() => requestSort('action')}
                >
                  Action {sortConfig.key === 'action' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Trigger</th>
                <th 
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer"
                  onClick={() => requestSort('status')}
                >
                  Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer"
                  onClick={() => requestSort('createdAt')}
                >
                  Created At {sortConfig.key === 'createdAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Result</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center">
                    Loading orders...
                  </td>
                </tr>
              ) : sortedOrders.length > 0 ? (
                sortedOrders.map((order) => (
                  <tr key={order.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-4 align-middle">{order.token}</td>
                    <td className="p-4 align-middle">{order.action}</td>
                    <td className="p-4 align-middle">{order.trigger}</td>
                    <td className="p-4 align-middle">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        order.status === "Open" ? "bg-green-100 text-green-800" : 
                        order.status === "Executed" ? "bg-blue-100 text-blue-800" : 
                        "bg-red-100 text-red-800"
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4 align-middle">{new Date(order.createdAt).toLocaleString()}</td>
                    <td className="p-4 align-middle">
                      {order.status === "Executed" && order.txHash ? (
                        <a 
                          href={`https://nearblocks.io/txns/${order.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline text-xs"
                          title={order.txHash}
                        >
                          {order.txHash.substring(0, 10)}...{order.txHash.substring(order.txHash.length - 6)}
                        </a>
                      ) : (
                        order.status === "Open" ? (
                          <span className="text-muted-foreground text-xs">Pending execution</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">N/A</span>
                        )
                      )}
                    </td>
                    <td className="p-4 align-middle">
                      {order.status === "Open" && (
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => cancelOrder(order.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-muted-foreground">
                    {filters.token !== "all" || filters.status !== "all" || searchQuery !== '' ? 
                      "No orders found matching your filters. Try adjusting your criteria." : 
                      "No orders found. Create a new order to get started."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-8 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Statistics</h2>
          <div className="text-sm text-muted-foreground">
            {filteredOrders.length} orders shown {filters.token !== "all" || filters.status !== "all" || searchQuery !== '' ? 
              "(filtered)" : 
              "(all)"}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-muted rounded-lg p-4">
            <h3 className="text-lg font-medium mb-1">Total Orders</h3>
            <p className="text-3xl font-bold">{loading ? "..." : filteredOrders.length}</p>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <h3 className="text-lg font-medium mb-1">Active Orders</h3>
            <p className="text-3xl font-bold">{loading ? "..." : filteredOrders.filter(o => o.status === "Open").length}</p>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <h3 className="text-lg font-medium mb-1">Executed Orders</h3>
            <p className="text-3xl font-bold">{loading ? "..." : filteredOrders.filter(o => o.status === "Executed").length}</p>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <h3 className="text-lg font-medium mb-1">Cancelled Orders</h3>
            <p className="text-3xl font-bold">{loading ? "..." : filteredOrders.filter(o => o.status === "Cancelled").length}</p>
          </div>
        </div>
      </div>
    </CommonLayout>
  );
}
