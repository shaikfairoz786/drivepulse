import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC<{ message?: string; className?: string }> = ({
  message = 'Loading data...',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <Loader2 className="w-6 h-6 animate-spin text-brand-600 mb-2" />
      <p className="text-xs font-medium text-slate-500">{message}</p>
    </div>
  );
};
