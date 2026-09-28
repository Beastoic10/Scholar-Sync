import React from 'react';

export const BackgroundScene: React.FC = () => {
  return (
    <div className="bg-scene-container" aria-hidden="true">
      {/* Dynamic Aurora Gradient Base */}
      <div className="bg-aurora-base" />

      {/* Floating Animated Plasma Orbs */}
      <div className="orb-layer">
        <div className="glow-orb orb-indigo" />
        <div className="glow-orb orb-cyan" />
        <div className="glow-orb orb-purple" />
        <div className="glow-orb orb-amber" />
        <div className="glow-orb orb-emerald" />
      </div>

      {/* Tech / Research Dot Grid Overlay */}
      <div className="research-grid-overlay" />

      {/* Scientific Orbital Rings & Astrolabe Watermark */}
      <div className="orbital-watermark-wrapper">
        <svg
          className="orbital-rings-svg spin-slow"
          viewBox="0 0 1000 1000"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Concentric Research Orbitals */}
          <circle cx="500" cy="500" r="460" stroke="url(#ringGrad1)" strokeWidth="1" strokeDasharray="6 10" opacity="0.4" />
          <circle cx="500" cy="500" r="380" stroke="url(#ringGrad2)" strokeWidth="1.5" strokeDasharray="14 18" opacity="0.5" />
          <circle cx="500" cy="500" r="300" stroke="url(#ringGrad1)" strokeWidth="1" opacity="0.35" />
          <circle cx="500" cy="500" r="220" stroke="url(#ringGrad2)" strokeWidth="1.2" strokeDasharray="4 8" opacity="0.6" />
          <circle cx="500" cy="500" r="140" stroke="url(#ringGrad1)" strokeWidth="1" strokeDasharray="20 12" opacity="0.4" />
          <circle cx="500" cy="500" r="60" stroke="#38bdf8" strokeWidth="1" opacity="0.7" />

          {/* Crosshairs and Angle Markers */}
          <line x1="500" y1="20" x2="500" y2="980" stroke="url(#lineGrad)" strokeWidth="0.8" opacity="0.25" strokeDasharray="8 8" />
          <line x1="20" y1="500" x2="980" y2="500" stroke="url(#lineGrad)" strokeWidth="0.8" opacity="0.25" strokeDasharray="8 8" />
          <line x1="160" y1="160" x2="840" y2="840" stroke="url(#lineGrad)" strokeWidth="0.6" opacity="0.18" strokeDasharray="4 12" />
          <line x1="840" y1="160" x2="160" y2="840" stroke="url(#lineGrad)" strokeWidth="0.6" opacity="0.18" strokeDasharray="4 12" />

          {/* Orbit Satellite Nodes */}
          <circle cx="880" cy="500" r="4" fill="#38bdf8" opacity="0.8" className="pulse-slow" />
          <circle cx="500" cy="120" r="3.5" fill="#818cf8" opacity="0.8" />
          <circle cx="280" cy="280" r="3" fill="#34d399" opacity="0.7" />
          <circle cx="720" cy="720" r="3.5" fill="#f59e0b" opacity="0.6" />

          <defs>
            <linearGradient id="ringGrad1" x1="0" y1="0" x2="1000" y2="1000" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="0.5" stopColor="#818cf8" stopOpacity="0.2" />
              <stop offset="1" stopColor="#c084fc" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="ringGrad2" x1="1000" y1="0" x2="0" y2="1000" gradientUnits="userSpaceOnUse">
              <stop stopColor="#34d399" stopOpacity="0.7" />
              <stop offset="0.5" stopColor="#6366f1" stopOpacity="0.3" />
              <stop offset="1" stopColor="#38bdf8" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1000" y2="1000" gradientUnits="userSpaceOnUse">
              <stop stopColor="#60a5fa" />
              <stop offset="1" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>

        {/* Secondary Counter-rotating Rings */}
        <svg
          className="orbital-rings-svg-secondary spin-counter"
          viewBox="0 0 600 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <ellipse cx="300" cy="300" rx="270" ry="120" stroke="#818cf8" strokeWidth="1" strokeDasharray="6 14" opacity="0.35" transform="rotate(35 300 300)" />
          <ellipse cx="300" cy="300" rx="270" ry="120" stroke="#38bdf8" strokeWidth="1" strokeDasharray="10 18" opacity="0.3" transform="rotate(-40 300 300)" />
        </svg>
      </div>

      {/* Constellation & Knowledge Graph Nodes */}
      <div className="constellation-layer">
        <div className="node-point n1" />
        <div className="node-point n2" />
        <div className="node-point n3" />
        <div className="node-point n4" />
        <div className="node-point n5" />
        <div className="node-point n6" />
      </div>

      {/* Vignette Overlay for focus */}
      <div className="bg-vignette" />
    </div>
  );
};
