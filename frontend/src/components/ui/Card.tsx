import React from 'react';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
  <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all ${className}`} {...props}>
    {children}
  </div>
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
  <div className={`px-5 py-4 border-b border-slate-100 flex items-center justify-between ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement> & { level?: 2 | 3 | 4 }> = ({
  className = '',
  children,
  level = 3,
  ...props
}) => {
  const Tag = `h${level}` as 'h2' | 'h3' | 'h4';
  return (
    <Tag className={`text-base font-bold text-slate-800 tracking-tight ${className}`} {...props}>
      {children}
    </Tag>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`p-5 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
  <div className={`px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between ${className}`} {...props}>
    {children}
  </div>
);
