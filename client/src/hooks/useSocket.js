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
    if (!token) return;

    // Reuse existing connection
    if (!socket) {
      socket = io(window.location.origin, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionDelay: 2000,
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
