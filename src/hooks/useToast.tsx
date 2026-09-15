import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastMessage } from '../types';

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = 'toast-' + Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { ...toast, id };
    setToasts(prev => [...prev, newToast]);

    const duration = toast.duration ?? 3500;
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const showSuccess = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message });
  }, [addToast]);

  const showError = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message, duration: 4500 });
  }, [addToast]);

  const showWarning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message, duration: 4000 });
  }, [addToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
    </ToastContext.Provider>
  );
};

const fallbackContext: ToastContextType = {
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
  showSuccess: (title: string, message?: string) => console.log(`[Toast Success] ${title}: ${message || ''}`),
  showError: (title: string, message?: string) => console.error(`[Toast Error] ${title}: ${message || ''}`),
  showWarning: (title: string, message?: string) => console.warn(`[Toast Warning] ${title}: ${message || ''}`),
  showInfo: (title: string, message?: string) => console.info(`[Toast Info] ${title}: ${message || ''}`),
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    console.warn('useToast was called outside of ToastProvider. Using fallback toast handler.');
    return fallbackContext;
  }
  return context;
}
