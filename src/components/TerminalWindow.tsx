import React from "react";

interface TerminalWindowProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}

export const TerminalWindow: React.FC<TerminalWindowProps> = ({ title, subtitle, children, className = "" }) => {
  return (
    <div className={`mx-auto mt-12 max-w-3xl ${className}`}>
      <div className="bg-[#0b0f13] border border-neutral-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-b from-[#0d1113]/40 to-transparent border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-[#ff5f56] rounded-full shadow-sm" />
            <span className="w-3 h-3 bg-[#ffbd2e] rounded-full shadow-sm" />
            <span className="w-3 h-3 bg-[#27c93f] rounded-full shadow-sm" />
          </div>

          <div className="text-sm text-neutral-300 font-medium select-none">
            {title ?? "Dictionary Terminal"}
          </div>

          <div className="flex items-center gap-3 text-neutral-400 text-sm">
            <div className="uppercase text-[11px] tracking-wider">history</div>
            <div className="uppercase text-[11px] tracking-wider">settings</div>
          </div>
        </div>

        <div className="px-6 py-6 font-mono text-sm text-neutral-200">
          {subtitle && <div className="text-green-300 font-semibold mb-2">{subtitle}</div>}
          {children}
        </div>
      </div>
    </div>
  );
};

export default TerminalWindow;
