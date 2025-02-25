const http = require("http");
const mongoose = require("mongoose");
const { wss } = require("./websocket/chat");

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Chat Service");
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

connectDB();

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

const PORT = process.env.PORT || 3003;
server.listen(PORT, () => console.log(`Chat service running on port ${PORT}`));
