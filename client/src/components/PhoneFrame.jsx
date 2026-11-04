import React from 'react';

/**
 * PhoneFrame - renders the driver mobile interface inside a realistic phone shell on desktop.
 * On real mobile screens, it renders full-screen without the frame.
 */
export default function PhoneFrame({ children }) {
  return (
    <div className="min-h-screen bg-navy-900 md:py-8 flex items-center justify-center">
      {/* Phone container */}
      <div className="w-full h-full md:w-[412px] md:h-[860px] bg-surface md:rounded-[40px] md:shadow-2xl md:border-[10px] md:border-navy-800 flex flex-col overflow-hidden relative">
        {/* Top Speaker / Camera Notch on Desktop */}
        <div className="hidden md:flex justify-center items-center h-5 w-full bg-navy-800 shrink-0">
          <div className="w-16 h-1 bg-navy-900 rounded-full" />
        </div>

        {/* Phone Content viewport with independent scrolling */}
        <div className="flex-1 overflow-y-auto flex flex-col relative">
          {children}
        </div>

        {/* Bottom Home Indicator Bar on Desktop */}
        <div className="hidden md:flex justify-center items-center h-4 w-full bg-surface shrink-0 pb-1">
          <div className="w-28 h-1 bg-slate-300 rounded-full" />
        </div>
      </div>
    </div>
  );
}

