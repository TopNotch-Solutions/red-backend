module.exports = function handleSessions(io, socket, deps) {
  socket.on('getSessions', async () => {
    const { getUserSessions } = deps;
    try {
      const sessions = await getUserSessions(socket.user);
      socket.emit('sessionsList', sessions);
    } catch (err) {
      console.error('🔥 Error fetching sessions:', err);
      socket.emit('error', 'Failed to fetch sessions');
    }
  });
};