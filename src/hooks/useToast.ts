import { useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'default';

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: ToastType; visible: boolean }>({
    message: '',
    type: 'default',
    visible: false,
  });

  const showToast = useCallback((message: string, type: ToastType = 'default') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
  }, []);

  return { toast, showToast };
}
