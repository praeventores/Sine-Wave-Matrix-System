export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket Upgrade", { status: 426 });
      }

      const id = env.ROOMS.idFromName("secure_audio_network");
      const roomObject = env.ROOMS.get(id);
      
      return roomObject.fetch(request);
    }

    return new Response("Secure Audio Matrix Terminal Node", { status: 200 });
  }
};

export class AudioRoom {
  constructor(state, env) {
    this.sessions = new Set();
  }

  async fetch(request) {
    const [client, server] = Object.values(new WebSocketPair());

    server.accept();
    this.sessions.add(server);

    server.addEventListener("message", (msg) => {
      try {
        // Echo package down the pipe to all other active station nodes
        for (const session of this.sessions) {
          if (session !== server && session.readyState === WebSocket.OPEN) {
            session.send(msg.data);
          }
        }
      } catch (err) {
        console.error("Relay failure:", err);
      }
    });

    server.addEventListener("close", () => {
      this.sessions.delete(server);
    });

    return new Response(null, { status: 101, webSocket: client });
  }
}
