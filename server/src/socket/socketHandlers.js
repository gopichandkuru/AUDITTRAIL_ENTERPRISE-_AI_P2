const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on('join_dashboard', () => {
      socket.join('dashboard');
      socket.emit('connected', { message: 'Connected to AuditTrail live feed' });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
};

module.exports = { initSocket };
