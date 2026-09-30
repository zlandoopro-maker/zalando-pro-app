import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info';

interface NotificationOptions {
  type?: NotificationType;
  duration?: number;
  title?: string;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface NotificationContextType {
  showNotification: (message: string, options?: NotificationOptions) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<{
    id: number;
    message: string;
    type: NotificationType;
    title?: string;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
  } | null>(null);

  const showNotification = useCallback((message: string, options?: NotificationOptions) => {
    const id = Date.now();
    setNotification({
      id,
      message,
      type: options?.type || 'info',
      title: options?.title,
      onConfirm: options?.onConfirm,
      confirmText: options?.confirmText || 'Confirm',
      cancelText: options?.cancelText || 'Cancel',
    });

    // If it's a confirmation, don't auto-dismiss
    if (!options?.onConfirm && options?.duration !== 0) {
      setTimeout(() => {
        setNotification(prev => prev?.id === id ? null : prev);
      }, options?.duration || 4000);
    }
  }, []);

  const closeNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const handleConfirm = useCallback(() => {
    if (notification?.onConfirm) {
      notification.onConfirm();
    }
    closeNotification();
  }, [notification, closeNotification]);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <AnimatePresence>
        {notification && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-xs bg-white dark:bg-[#1C1E24] rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-slate-800/50 p-6 pointer-events-auto overflow-hidden relative"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  notification.type === 'success' ? 'bg-emerald-50 text-emerald-500' :
                  notification.type === 'error' ? 'bg-rose-50 text-rose-500' :
                  'bg-blue-50 text-blue-500'
                }`}>
                  {notification.type === 'success' && <CheckCircle2 className="w-8 h-8" />}
                  {notification.type === 'error' && <AlertCircle className="w-8 h-8" />}
                  {notification.type === 'info' && <Info className="w-8 h-8" />}
                </div>

                <div className="space-y-1">
                  {notification.title && (
                    <h3 className="text-sm font-black italic uppercase tracking-wider text-slate-800 dark:text-white leading-tight">
                      {notification.title}
                    </h3>
                  )}
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed px-2">
                    {notification.message}
                  </p>
                </div>

                <div className="w-full space-y-2 pt-2">
                  <button
                    onClick={handleConfirm}
                    style={{ backgroundColor: '#4A69BD', color: '#FFFFFF' }}
                    className="w-full py-3.5 rounded-2xl text-[10px] font-black italic uppercase tracking-widest active:scale-95 transition-transform shadow-lg shadow-primary/20"
                  >
                    {notification.confirmText}
                  </button>
                  {notification.onConfirm && (
                    <button
                      onClick={closeNotification}
                      className="w-full py-3 text-slate-500 dark:text-slate-400 rounded-2xl text-[10px] font-black italic uppercase tracking-widest active:scale-95 transition-transform"
                    >
                      {notification.cancelText}
                    </button>
                  )}
                </div>
              </div>

              {/* Decorative background element */}
              <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full opacity-5 blur-2xl ${
                notification.type === 'success' ? 'bg-emerald-500' :
                notification.type === 'error' ? 'bg-rose-500' :
                'bg-blue-500'
              }`} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
