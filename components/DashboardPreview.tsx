import React from 'react';
import { TrendingDown, TrendingUp, ChevronDown, X } from 'lucide-react';
import { Gauge } from './Gauge';

export function DashboardPreview() {
  return (
    <div className="px-3 sm:px-4 w-full z-10 relative mt-4">
      <div className="bg-[#f5f2ee] rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 w-full max-w-[880px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          
          {/* Card 1 — Clicks */}
          <div className="bg-white rounded-2xl p-5 flex flex-col shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[#ef4d23] font-medium text-[13px]">Clicks</span>
              <span className="text-neutral-500 text-[13px]">This Month</span>
            </div>
            
            <div className="flex items-end gap-2 mb-1">
              <span className="text-[28px] font-semibold leading-none tracking-tight">6,896</span>
              <div className="bg-red-50 text-red-600 rounded-full px-2 py-0.5 flex items-center gap-1 mb-1">
                <TrendingDown className="w-[11px] h-[11px]" />
                <span className="text-[11px] font-medium">-3,382 (33%)</span>
              </div>
            </div>
            
            <div className="text-[12px] text-neutral-400 mb-6">Compared to yesterday</div>
            
            <div className="text-[12px] font-medium text-center text-neutral-600 mb-2">Month Target achieved</div>
            
            <div className="mb-4">
              <Gauge value={92} color="#ef4d23" showLabels min="389K" max="425K" />
            </div>
            
            <div className="mt-auto">
              <div className="bg-neutral-100 rounded-full p-1 flex">
                <button className="flex-1 text-[12px] font-medium py-1.5 rounded-full text-neutral-500 hover:text-neutral-700 transition-colors">
                  Clicks
                </button>
                <button className="flex-1 text-[12px] font-medium py-1.5 rounded-full bg-white shadow-sm text-neutral-800">
                  Impressions
                </button>
              </div>
            </div>
          </div>

          {/* Card 2 — Form */}
          <div className="bg-white rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
            <div>
              <label className="block text-[12px] text-neutral-700 font-medium mb-1.5">Show figures for</label>
              <button className="flex justify-between items-center border border-neutral-200 rounded-lg px-3 py-2 text-[13px] w-full text-neutral-800 hover:bg-neutral-50 transition-colors">
                This month
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              </button>
            </div>
            
            <div>
              <label className="block text-[12px] text-neutral-700 font-medium mb-1.5">Compare period by</label>
              <button className="flex justify-between items-center border border-neutral-200 rounded-lg px-3 py-2 text-[13px] w-full text-neutral-800 hover:bg-neutral-50 transition-colors">
                Month-to-date (MTD)
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              </button>
            </div>
            
            <div>
              <label className="block text-[12px] text-neutral-700 font-medium mb-1.5">Ste targets (This month)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[13px]">#</span>
                <input 
                  type="text" 
                  value="10" 
                  readOnly
                  className="w-full border border-neutral-200 rounded-lg pl-7 pr-3 py-2 text-[13px] text-neutral-800 focus:outline-none"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[12px] text-neutral-700 font-medium mb-1.5">Ste targets (This year)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[13px]">#</span>
                <input 
                  type="text" 
                  value="100" 
                  readOnly
                  className="w-full border border-neutral-200 rounded-lg pl-7 pr-3 py-2 text-[13px] text-neutral-800 focus:outline-none"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4 mt-auto pt-2">
              <button className="bg-[#ef4d23] hover:bg-[#d93a12] transition-colors text-white text-[13px] font-medium rounded-lg px-5 py-2">
                Save
              </button>
              <button className="text-neutral-500 hover:text-neutral-800 text-[13px] underline underline-offset-2">
                Cancel
              </button>
              <button className="ml-auto text-neutral-400 hover:text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Card 3 — Video Starts */}
          <div className="bg-white rounded-2xl p-5 flex flex-col shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[#ef4d23] font-medium text-[13px]">Video Starts</span>
              <span className="text-neutral-500 text-[13px]">today</span>
            </div>
            
            <div className="flex items-end gap-2 mb-1">
              <span className="text-[28px] font-semibold leading-none tracking-tight">0</span>
              <div className="bg-neutral-100 text-neutral-600 rounded-full px-2 py-0.5 flex items-center gap-1 mb-1">
                <TrendingUp className="w-[11px] h-[11px]" />
                <span className="text-[11px] font-medium">0</span>
              </div>
            </div>
            
            <div className="text-[12px] text-neutral-400 mb-8">Compared to yesterday</div>
            
            <div className="mb-4">
              <Gauge value={68} color="#9ca3af" />
            </div>
            
            <div className="mt-auto">
              <div className="bg-neutral-100 rounded-full p-1 flex">
                <button className="flex-1 text-[12px] font-medium py-1.5 rounded-full bg-white shadow-sm text-neutral-800">
                  Video Clicks
                </button>
                <button className="flex-1 text-[12px] font-medium py-1.5 rounded-full text-neutral-500 hover:text-neutral-700 transition-colors">
                  Video Starts
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
