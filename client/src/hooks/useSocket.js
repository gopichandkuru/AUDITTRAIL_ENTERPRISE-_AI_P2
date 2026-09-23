import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

let socket = null;

/**
 * useSocket — attach to the server's Socket.IO connection.
 * @param {function} onEvent — called with each shipment_event payload
 */
export function useSocket(onEvent) {
  const { token } = useAuthStore();
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!token) {
      // Logout: disconnect and clean up
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      return;
    }

    // Reuse existing connection
    if (!socket) {
      const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
      socket = io(socketUrl, {
        path: '/socket.io',
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionDelay: 2000,
        reconnectionAttempts: 5,
      });
    }

    const handler = (data) => onEventRef.current?.(data);
    socket.on('shipment_event', handler);

    return () => {
      socket.off('shipment_event', handler);
    };
  }, [token]);
}

export default useSocket;
