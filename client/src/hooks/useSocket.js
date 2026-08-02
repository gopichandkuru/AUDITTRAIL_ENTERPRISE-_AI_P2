import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useUIStore } from '../store/uiStore';

let socket = null;

export const useSocket = (onNewLog) => {
  const addNotification = useUIStore((s) => s.addNotification);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    socket = io('/', { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      socket.emit('join_dashboard');
    });

    socket.on('new_log', (log) => {
      if (onNewLog) onNewLog(log);
    });

    socket.on('alert_triggered', (notification) => {
      addNotification(notification);
    });

    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
        mounted.current = false;
      }
    };
  }, []);

  return socket;
};

export { socket };
