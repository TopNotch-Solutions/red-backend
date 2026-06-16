module.exports = function chatHandlers(io, socket, deps) {
  socket.on('deleteChat', async (data) => {
    const { deleteChat } = deps;
    try {
      await deleteChat(socket, data);
    } catch (err) {
      console.error('Error in deleteChat:', err);
      socket.emit('error', 'An error occurred while deleting the chat.');
    }
  });

  // Add other chat-related events here (deleteMessage, joinIssueChat, etc.)
};
