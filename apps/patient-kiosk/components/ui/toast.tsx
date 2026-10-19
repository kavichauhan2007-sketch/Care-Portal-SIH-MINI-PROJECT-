'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const ToastContext = React.createContext<{
  toasts: any[];
  addToast: (toast: any) => void;
  removeToast: (id: string) => void;
}>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
});

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = React.useState<any[]>([]);

  const addToast = (toast: any) => {
    setToasts((prev) => [...prev, toast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const Toast = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'destructive';
  }
>(({ className, variant = 'default', ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-6 pr-8 shadow-lg transition-all',
        variant === 'destructive'
          ? 'destructive group border-destructive bg-destructive text-destructive-foreground'
          : 'border bg-background text-foreground',
        className
      )}
      {...props}
    />
  );
});
Toast.displayName = 'Toast';

export const ToastViewport = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]',
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = 'ToastViewport';
