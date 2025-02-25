const WebSocket = require("ws");
const Message = require("../models/message");

const wss = new WebSocket.Server({ noServer: true });
const chats = new Map();

wss.on("connection", (ws, req) => {
  const streamId = req.url.split("/")[1];
  if (!streamId) {
    ws.close();
    return;
  }

  if (!chats.has(streamId)) {
    chats.set(streamId, new Set());
  }
  chats.get(streamId).add(ws);

  ws.on("message", async (message) => {
    const data = JSON.parse(message);
    const { userId, content } = data;

    const msg = new Message({ streamId, userId, content });
    await msg.save();

    chats.get(streamId).forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({ user: userId, content, timestamp: msg.timestamp })
        );
      }
    });
  });

  ws.on("close", () => {
    chats.get(streamId).delete(ws);
    if (chats.get(streamId).size === 0) {
      chats.delete(streamId);
    }
  });
});

module.exports = { wss };
