import React from 'react';

export const Card = ({ children, className = "", ...props }: { children: React.ReactNode, className?: string, [key: string]: any }) => (
  <div 
    className={`bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] ${className}`} 
    {...props}
  >
    {children}
  </div>
);

export const StatCard = ({ title, value, icon: Icon, colorClass, subtitle }: any) => (
  <Card className="p-0">
    <div className="p-6 flex items-start gap-5">
      <div className={`w-14 h-14 rounded-2xl ${colorClass} flex items-center justify-center shadow-sm`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-2">{title}</div>
        <div className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{value}</div>
        {subtitle && <div className="text-[13px] text-gray-400 mt-2 font-medium">{subtitle}</div>}
      </div>
    </div>
    <div className={`h-1 w-full ${colorClass.includes('blue') ? 'bg-blue-400' : colorClass.includes('amber') ? 'bg-amber-400' : colorClass.includes('emerald') || colorClass.includes('green') ? 'bg-emerald-400' : 'bg-gray-300'} opacity-40`}></div>
  </Card>
);
