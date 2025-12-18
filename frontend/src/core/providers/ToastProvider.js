import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { Toast } from '../components/Toast';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={styles.toastContainer} pointerEvents="box-none">
          <SafeAreaView pointerEvents="box-none">
            {toasts.map(toast => (
                <Toast 
                    key={toast.id} 
                    {...toast} 
                    onDismiss={removeToast} 
                />
            ))}
          </SafeAreaView>
      </View>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 50, // Below standard headers
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
  }
});
