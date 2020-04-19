class NetworkServer {
  constructor(simulator) {
    this.simulator = simulator;
    this.clients = [];
    this.defaultgamerate = 1000 * (1 / 30);
    this.gameUpdateTimeout = setTimeout(
      this.update.bind(this),
      this.defaultgamerate
    );
    this.stableFrame = 0;
    this.newclientid = 0;
  }
  update() {
    this.simulator.advanceToNextMoment();
    this.gameUpdateTimeout = setTimeout(
      this.update.bind(this),
      this.defaultgamerate
    );
  }
  recalculateStableFrame() {
    this.stableFrame = this.clients
      .map((client) => client.lastFrame)
      .reduce(Math.min, Infinity);
    this.simulator.forgetMomentsBefore(this.stableFrame);
  }
  createClient(messenger) {
    var client = new Client({
      status: Client.STATUS_ACTIVE,
      id: this.newclientid++,
      server: this,
      messenger: messenger,
      lastframe: this.simulator.getCurrentFrame(),
    });
    this.clients.push(client);

    // Initialize client.
    this.simulator.pushEvent({
      type: "connect",
      clientid: client.id,
    });
    client.broadcast({
      type: "connect",
      clientid: client.id,
      frame: this.simulator.getCurrentFrame(),
    });
    client.messenger.send({
      type: "initialize",
      clientid: client.id,
      state: this.simulator.getOldestState(),
      events: this.simulator.getEvents(),
      currentframe: this.simulator.getCurrentFrame(),
    });

    if (this.onclientadded) {
      this.onclientadded(client);
    }

    return client;
  }
  removeClient(client) {
    
    const clientIndex = this.clients.indexOf(client);
    if (clientIndex === -1) { return; }
    this.clients.splice(clientIndex, 1);

    this.simulator.pushEvent({
      type: "disconnect",
      clientid: client.id,
    });
    client.broadcast({
      type: "disconnect",
      clientid: client.id,
      frame: this.simulator.getCurrentFrame(),
    });

    if (this.onclientremoved) {
      this.onclientremoved(client);
    }
    if (this.clients.length === 0 && this.onempty) {
      this.onempty();
    }
  }
  broadcast(msg) {
    for (const client of this.clients) {
      client.messenger.send(msg);
    }
  }
  close() {
    clearTimeout(this.gameUpdateTimeout);
  }
}

class Client {
  static STATUS_ACTIVE = 0;
  static STATUS_RESETTING = 2;
  constructor({ status, id, server, messenger, lastFrame }) {
    this.status = status;
    this.id = id;
    this.server = server;
    this.messenger = messenger;
    this.lastFrame = lastFrame;

    messenger.onmessage = this.handleMessage.bind(this);
    messenger.onclose = this.handleDisconnect.bind(this);
  }
  broadcast(msg) {
    const otherClients = Object.values(this.server.clients).filter(
      (client) => client !== this
    );
    for (const client of otherClients) {
      client.messenger.send(msg);
    }
  }
  handleMessage(msg) {
    // Guard against invalid messages being handled.
    if (
      msg.frame &&
      msg.type !== "syn" &&
      this.server.simulator.isFramePrehistoric(msg.frame)
    ) {
      log.warn("Detected message from prehistoric frame", {
        frame: msg.frame,
        clientId: this.id,
      });
      if (this.status === Client.STATUS_ACTIVE) {
        log.warn("Disconnect from client", { clientId: this.id });
        this.messenger.close();
      }
      return;
    }

    // Handle individual messages.
    switch (msg.type) {
      case "syn":
        return this.handleSyn(msg);
      case "ack":
        return this.handleAck(msg);
      case "debug":
        return this.handleDebug(msg);
      case "game-input":
        return this.handleGameInput(msg);
      case "disconnect":
        return this.handleDisconnect(msg);
      default:
        log.debug("Ignoring unrecognized message type", { type: msg.type });
        return;
    }
  }

  handleSyn(msg) {
    this.lastframe = msg.frame;
    this.server.recalculateStableFrame();
    this.messenger.send({
      type: "ack",
      oframe: msg.frame,
      nframe: this.server.simulator.getCurrentFrame(),
      stableframe: this.server.stableframe,
    });
  }

  handleAck(msg) {
    this.latency = msg.latency;
  }

  handleGameInput({ frame, input }) {
    this.server.simulator.pushEvent({
      type: "game-input",
      clientid: this.id,
      frame,
      input,
    });
    this.broadcast({
      type: "game-input",
      clientid: this.id,
      frame,
      input,
    });
  }

  handleDebug(msg) {
    log.debug("Received debug message", { msg });
  }

  handleDisconnect() {
    var simulator = this.server.simulator;
    simulator.pushEvent({
      type: "disconnect",
      clientid: this.id,
    });
    this.broadcast({
      type: "disconnect",
      clientid: this.id,
      frame: simulator.getCurrentMoment().state.frame,
    });
    this.server.removeClient(this);
    log.info("Client disconnected", { clientId: this.id });
  }
}

module.exports = {
  NetworkServer,
  Client,
}