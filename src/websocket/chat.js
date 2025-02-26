const WebSocket = require("ws");
const Message = require("../models/message");

const wss = new WebSocket.Server({ noServer: true });
const chats = new Map();

wss.on("connection", (ws, req) => {
  const urlParts = req.url.split("?");
  const streamId = urlParts[0].split("/")[1];
  const query = new URLSearchParams(urlParts[1]);
  const token = query.get("token");

  if (!streamId || !token) {
    ws.close();
    return;
  }

  try {
    const { verifyToken } = require("../utils/auth");
    const user = verifyToken(token);
    ws.user = user;
  } catch (error) {
    ws.close();
    return;
  }

  if (!chats.has(streamId)) {
    chats.set(streamId, new Set());
  }
  chats.get(streamId).add(ws);

  ws.on("message", async (message) => {
    const data = JSON.parse(message);
    const { content } = data;

    try {
      const msg = new Message({ streamId, userId: ws.user.id, content });
      await msg.save();

      const chat = chats.get(streamId);
      if (chat) {
        chat.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                user: ws.user.id,
                content,
                timestamp: msg.timestamp,
              })
            );
          }
        });
      }
    } catch (error) {
      console.error("Chat message error:", error);
    }
  });

  ws.on("close", () => {
    const chat = chats.get(streamId);
    if (!chat) return;
    chat.delete(ws);
    if (chat.size === 0) {
      chats.delete(streamId);
    }
  });
});

module.exports = { wss };
