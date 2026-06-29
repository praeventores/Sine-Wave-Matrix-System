export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only accept WebSocket connections at the /ws endpoint
    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket Upgrade", { status: 426 });
      }

      // Route all traffic to a single Durable Object instance named "global_room"
      const id = env.ROOMS.idFromName("global_room");
      const roomObject = env.ROOMS.get(id);
      
      return roomObject.fetch(request);
    }

    return new Response("Terminal Audio Matrix Server Node", { status: 200 });
  }
};

// --- The Durable Object Room Coordinator ---
export class AudioRoom {
  constructor(state, env) {
    this.sessions = new Set();
  }

  async fetch(request) {
    const [client, server] = Object.values(new WebSocketPair());

    // Accept server side and store in session memory list
    server.accept();
    this.sessions.add(server);

    server.addEventListener("message", (msg) => {
      try {
        // Broadcast the raw sequence payload to all other connected nodes
        for (const session of this.sessions) {
          if (session !== server && session.readyState === WebSocket.OPEN) {
            session.send(msg.data);
          }
        }
      } catch (err) {
        console.error("Broadcast failed:", err);
      }
    });

    server.addEventListener("close", () => {
      this.sessions.delete(server);
    });

    server.addEventListener("error", () => {
      this.sessions.delete(server);
    });

    return new Response(null, { status: 101, webSocket: client });
  }
}
