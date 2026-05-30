import React from 'react';

export const CRTOverlay = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-50 crt-flicker overflow-hidden rounded-2xl">
      <div className="scanline" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent" />
    </div>
  );
};
