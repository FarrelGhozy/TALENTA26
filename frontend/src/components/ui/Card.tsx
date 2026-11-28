import React from 'react';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
  <div className={`overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-[0_12px_32px_-28px_rgba(8,42,70,0.4)] transition-all ${className}`} {...props}>
    {children}
  </div>
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
  <div className={`flex items-center justify-between border-b border-slate-100 px-5 py-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement> & { level?: 2 | 3 | 4 }> = ({
  className = '', children, level = 3, ...props
}) => {
  const Tag = `h${level}` as 'h2' | 'h3' | 'h4';
  return <Tag className={`text-base font-bold tracking-tight text-slate-900 ${className}`} {...props}>{children}</Tag>;
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
  <div className={`p-5 ${className}`} {...props}>{children}</div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
  <div className={`flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-5 py-3.5 ${className}`} {...props}>{children}</div>
);
