"use client";

import React, { ReactNode } from "react";
import Navbar from "@/components/navbar";

interface CommonLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function CommonLayout({ children, title }: CommonLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container py-6 md:py-10">
          {title && (
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            </div>
          )}
          {children}
        </div>
      </main>
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} 🥷 Shade Trader - Conditional Limit Orders, Powered by NEAR-Intents 🪄, trustless & verifiable by NEAR's Shade Agent 🤖
          </p>
        </div>
      </footer>
    </div>
  );
}
