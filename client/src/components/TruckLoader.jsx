import React from 'react';
import { Truck } from 'lucide-react';

/**
 * Signature Brand Loading State - a truck traversing along amber dots.
 */
export default function TruckLoader({ message = 'Loading...', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <div className="relative w-48 h-12 flex items-center justify-between">
        {/* Dotted path */}
        <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 border-t-2 border-dotted border-amber-300" />

        {/* Animated truck */}
        <div className="relative z-10 animate-bounce">
          <div className="w-9 h-9 rounded-full bg-amber-500 text-navy-900 flex items-center justify-center shadow-md">
            <Truck className="w-5 h-5 text-navy-900 stroke-[2.2]" />
          </div>
        </div>

        {/* Static dots */}
        <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-navy-700" />
      </div>

      {message && (
        <p className="mt-3 text-sm font-medium text-ink-muted animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}

