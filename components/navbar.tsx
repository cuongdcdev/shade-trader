"use client";

import Link from "next/link";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { Button } from "@/components/ui/button";
import { PlusCircle, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        {/* Logo and desktop navigation */}
        <div className="mr-4 flex-1 flex items-center justify-between md:justify-start">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold inline-block">🥷 Shade Trader</span>
          </Link>
          
          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/dashboard" className="transition-colors hover:text-foreground/80 text-foreground">
              📊 My Dashboard
            </Link>
            
            <Link href="/open-orders" className="transition-colors hover:text-foreground/80 text-foreground">
              📝 Open Orders
            </Link>

            <Link href="/settings" className="transition-colors hover:text-foreground/80 text-foreground">
              ⚙️ Settings
            </Link>
          </nav>
          
          {/* Mobile menu toggle button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="md:hidden" 
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Right-side buttons */}
        <div className="flex items-center space-x-4">
          <Button asChild variant="default" size="sm" className="hidden md:flex items-center">
            <Link href="/create">
              <PlusCircle className="mr-1 h-4 w-4" />
              Create Order
            </Link>
          </Button>
          
          <div className="md:w-auto md:flex-none">
            <ConnectWalletButton />
          </div>
        </div>
      </div>

      {/* Mobile menu (slides down when open) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background">
          <nav className="flex flex-col py-2">
            <Link 
              href="/dashboard" 
              className="px-4 py-2 hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              📊 Dashboard
            </Link>
            
            <Link 
              href="/open-orders" 
              className="px-4 py-2 hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              📝 Open Orders
            </Link>

            <Link 
              href="/settings" 
              className="px-4 py-2 hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              ⚙️ Settings
            </Link>
            
            {/* Prominent Create Order button in mobile menu */}
            <div className="px-4 py-3 mt-1 border-t border-border/40">
              <Button 
                asChild 
                variant="default" 
                size="sm" 
                className="w-full flex items-center justify-center"
              >
                <Link 
                  href="/create"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Order
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
