'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Menu, ChevronDown, ChevronRight } from 'lucide-react';

function LogoSVG() {
  return (
    <svg viewBox="0 0 32 32" className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 text-[#ef4d23] fill-current">
      <circle cx="16" cy="16" r="3.5" />
      <circle cx="26" cy="16" r="3.5" />
      <circle cx="23.07" cy="23.07" r="3.5" />
      <circle cx="16" cy="26" r="3.5" />
      <circle cx="8.93" cy="23.07" r="3.5" />
      <circle cx="6" cy="16" r="3.5" />
      <circle cx="8.93" cy="8.93" r="3.5" />
      <circle cx="16" cy="6" r="3.5" />
      <circle cx="23.07" cy="8.93" r="3.5" />
    </svg>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex justify-center pt-4 sm:pt-6 px-3 sm:px-4 w-full relative z-20">
      <nav className="bg-white rounded-full shadow-sm border border-neutral-200 pl-2 pr-2 py-2 w-full max-w-[760px] relative flex items-center">
        
        {/* Logo */}
        <div className="flex items-center pl-1">
          <LogoSVG />
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center ml-8 gap-6">
          <Link href="#" className="flex items-center gap-1.5 text-[14px] font-medium text-neutral-800">
            <span className="w-[3px] h-[3px] rounded-full bg-black block" />
            Home
          </Link>
          <Link href="#" className="text-[14px] font-medium text-neutral-500 hover:text-neutral-800 transition-colors">
            Features
          </Link>
          <Link href="#" className="text-[14px] font-medium text-neutral-500 hover:text-neutral-800 transition-colors">
            About
          </Link>
          <Link href="#" className="flex items-center gap-1 text-[14px] font-medium text-[#ef4d23]">
            Pages
            <ChevronDown className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Right Cluster */}
        <div className="ml-auto flex items-center gap-3 pr-1">
          <button className="hidden md:flex items-center justify-center w-9 h-9 rounded-full hover:bg-neutral-100 transition-colors text-neutral-600">
            <ShoppingCart className="w-5 h-5" />
          </button>
          
          <Link 
            href="#" 
            className="flex items-center gap-2 bg-[#ef4d23] hover:bg-[#d93a12] transition-colors text-white rounded-full py-1.5 pl-4 pr-1.5"
          >
            <span className="text-[13px] font-medium whitespace-nowrap">
              <span className="hidden sm:inline">Get early access</span>
              <span className="sm:hidden">Early access</span>
            </span>
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <ChevronRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Mobile Hamburger */}
          <button 
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-full hover:bg-neutral-100 text-neutral-600"
            onClick={() => setOpen(!open)}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {open && (
          <div className="absolute top-full left-2 right-2 mt-2 bg-white rounded-2xl shadow-lg border border-neutral-200 p-3 z-20 md:hidden flex flex-col gap-4">
            <Link href="#" className="flex items-center gap-2 text-[14px] font-medium text-neutral-800 px-2 py-1">
              <span className="w-[3px] h-[3px] rounded-full bg-black block" />
              Home
            </Link>
            <Link href="#" className="text-[14px] font-medium text-neutral-500 px-2 py-1">
              Features
            </Link>
            <Link href="#" className="text-[14px] font-medium text-neutral-500 px-2 py-1">
              About
            </Link>
            <Link href="#" className="flex items-center justify-between text-[14px] font-medium text-[#ef4d23] px-2 py-1">
              Pages
              <ChevronDown className="w-4 h-4" />
            </Link>
          </div>
        )}
      </nav>
    </div>
  );
}
