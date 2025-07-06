"use client";

import { useState, useEffect } from "react";
import CommonLayout from "@/components/common-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Order } from "@/types/custom";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

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

export default function OpenOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [filter, setFilter] = useState({
    token: "all",
    searchQuery: "",
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1
  });

  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getAllOrders(
          'Open', 
          filter.token !== 'all' ? filter.token : undefined
        );
        
        // Transform API response to match our UI format with better formatting
        const transformedOrders = response.orders.map(apiOrder => ({
          id: apiOrder.orderId,
          user: apiOrder.user || 'Unknown',
          token: apiOrder.action.token,
          condition: apiOrder.conditions.map(c => formatCondition(c)).join(' AND '),
          action: `${apiOrder.action.type} ${formatNumber(apiOrder.action.amount)} ${apiOrder.action.token}`,
          status: apiOrder.status as 'Open' | 'Executed' | 'Cancelled',
          createdAt: apiOrder.createdAt
        }));
        
        setOrders(transformedOrders);
        setPagination(response.pagination);
      } catch (error) {
        console.error("Error fetching open orders:", error);
        toast({
          title: "Failed to load orders",
          description: "There was an error loading the orders. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrders();
  }, [filter.token, toast]);
  
  // Update the refresh function to use the new formatting
  const refreshOrders = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAllOrders(
        'Open',
        filter.token !== 'all' ? filter.token : undefined,
        pagination.page,
        pagination.limit
      );
      
      const transformedOrders = response.orders.map(apiOrder => ({
        id: apiOrder.orderId,
        user: apiOrder.user || 'Unknown',
        token: apiOrder.action.token,
        condition: apiOrder.conditions.map(c => formatCondition(c)).join(' AND '),
        action: `${apiOrder.action.type} ${formatNumber(apiOrder.action.amount)} ${apiOrder.action.token}`,
        status: apiOrder.status as 'Open' | 'Executed' | 'Cancelled',
        createdAt: apiOrder.createdAt
      }));
      
      setOrders(transformedOrders);
      setPagination(response.pagination);
      toast({
        title: "Orders refreshed",
        description: "The order list has been refreshed.",
      });
    } catch (error) {
      console.error("Error refreshing orders:", error);
      toast({
        title: "Failed to refresh orders",
        description: "There was an error refreshing the orders. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Filter orders based on search query
  const filteredOrders = orders.filter(order => {
    const matchesSearch = filter.searchQuery === "" || 
      (order.user && order.user.toLowerCase().includes(filter.searchQuery.toLowerCase())) ||
      (order.condition && order.condition.toLowerCase().includes(filter.searchQuery.toLowerCase())) ||
      order.action.toLowerCase().includes(filter.searchQuery.toLowerCase());
      
    return matchesSearch;
  });
  
  return (
    <CommonLayout title="System-wide Open Orders">
      <div className="mb-6">
        <p className="text-muted-foreground mb-4">
          View all open orders across the system. These are orders that have not yet executed.
        </p>
      
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="md:w-1/3">
            <Label htmlFor="token-filter">Filter by Token</Label>
            <Select
              value={filter.token}
              onValueChange={(value) => {
                setFilter({...filter, token: value});
                // Re-fetch when token filter changes
                setPagination({...pagination, page: 1});
              }}
            >
              <SelectTrigger id="token-filter">
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tokens</SelectItem>
                <SelectItem value="NEAR">NEAR</SelectItem>
                <SelectItem value="ETH">ETH</SelectItem>
                <SelectItem value="BTC">BTC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="md:w-1/3">
            <Label htmlFor="search-query">Search</Label>
            <Input 
              id="search-query" 
              value={filter.searchQuery}
              onChange={(e) => setFilter({...filter, searchQuery: e.target.value})}
              placeholder="Search by user, condition, or action"
            />
          </div>
          
          <div className="md:w-1/3">
            <Label htmlFor="refresh-button">&nbsp;</Label>
            <button 
              id="refresh-button"
              className="w-full flex items-center justify-center h-10 px-4 py-2 bg-primary text-primary-foreground rounded-md"
              onClick={refreshOrders}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
      
      <div className="rounded-md border">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">User</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Token</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Condition</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Action</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Created At</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center">
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-4 align-middle font-mono">{order.user}</td>
                    <td className="p-4 align-middle">{order.token}</td>
                    <td className="p-4 align-middle">{order.condition}</td>
                    <td className="p-4 align-middle">{order.action}</td>
                    <td className="p-4 align-middle">{new Date(order.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-muted-foreground">
                    No orders found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-4 text-sm text-muted-foreground flex justify-between items-center">
        <div>
          Showing {filteredOrders.length} out of {pagination.total} open orders
        </div>
        {pagination.pages > 1 && (
          <div className="flex gap-2">
            {/* Simple pagination UI - can be expanded with a dedicated component */}
            <button 
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={pagination.page === 1}
              onClick={() => setPagination({...pagination, page: pagination.page - 1})}
            >
              Previous
            </button>
            <span className="px-3 py-1">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button 
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={pagination.page === pagination.pages}
              onClick={() => setPagination({...pagination, page: pagination.page + 1})}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </CommonLayout>
  );
}
