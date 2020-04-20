const log = require("./log");
const { stringify } = require('../shared/deterministic-json')
const hash = require('object-hash');

function toMs(frames) {
  return frames * (1000 / 30);
}

class NetworkClient {
  constructor({ messenger, simulator }) {
    this.messenger = messenger;
    this.simulator = simulator;
    this.messenger.onmessage = this.handleMessage.bind(this);
    this.status = NetworkClient.STATUS_INITIALIZING;

    this.defaultgamerate = 1000 * (1 / 30);
    this.latencySolving = 0;
  }

  handleMessage(msg) {
    if (msg.frame && this.simulator.isFramePrehistoric(msg.frame)) {
      // We should not be receiving pre-historic frames. We could be receiving
      // them while stopping the connection, but should not be receiving any
      // when the connection is active.
      if (this.status === NetworkClient.STATUS_ACTIVE) {
        // Inform the server of our state. This way we can get the client and
        // server state in the same log.
        this.messenger.send({
          type: "debug",
          content: {
            prehistoricMessage: msg,
            moments: this.simulator.moments,
            futureEvents: this.simulator.futureEvents,
          },
        });
        throw new Error("Received pre-historic frame while in active state");
      }

      // Skip handling pre-historic messages.
      return;
    }

    switch (msg.type) {
      case "initialize":
        return this.handleInitialize(msg);
      case "reset":
        return this.handleReset(msg);
      case "ack":
        return this.handleAck(msg);
      case "connect":
        return this.handleConnect(msg);
      case "disconnect":
        return this.handleDisconnect(msg);
      case "game-input":
        return this.handleGameInput(msg);
      default:
        return log.warn("Received unrecognized message", { msg });
    }
  }

  // General message handlers.
  handleInitialize(msg) {
    this.clientid = msg.clientid;

    this.simulator.resetState(msg.state, msg.events);
    this.simulator.fastForward(msg.currentframe);

    log.info("Initialized");
    this.status = NetworkClient.STATUS_ACTIVE;

    this.update();

    this.syninterval = setInterval(this.synchronizeTime.bind(this), 1000);
  }

  handleReset(msg) {
    var simulator = this.simulator;
    log.debug("Reset", {
      toFrame: msg.currentframe,
      stateFrame: msg.state.frame,
      eventCount: msg.events.length,
    });
    this.status = NetworkClient.STATUS_ACTIVE;
    simulator.resetState(msg.state, msg.events);
    simulator.fastForward(msg.currentframe);
    clearTimeout(this.gameupdateTimeout);
    this.update();
  }

  handleAck(msg) {
    var now = this.simulator.getCurrentFrame();
    var roundtripFrames = now - msg.oframe;
    var clientFrames = msg.oframe + roundtripFrames * 0.5;
    var framesDifference = clientFrames - msg.nframe;
    this.simulator.forgetMomentsBefore(msg.stableFrame);

    // We received a state from the server. We'll check whether the state is equal.
    if (msg.stableStateHash) {
      const serverStateHash = msg.stableStateHash;
      const clientState = this.simulator.getMoment(serverState.frame).state;
      const clientStateHash = hash(clientState);
      if (serverStateHash !== clientStateHash) {
        log.warn("Out of sync")
      }
    }

    if (-framesDifference >= 30) {
      // We're too far behind compared to the server (1 second),
      // so we need to fast-forward to the frame of the server.

      // This can happen when frames aren't being updated by
      // the game. In browsers this can happen when the tab
      // is not active, so that setTimeout is not triggered.

      // Another possibility is a slow client, fast-forwarding
      // will help, since it will not draw these frames.

      log.info(
        "Client too far behind server. Fast-forwarding to frame from server",
        { frame: msg.nframe }
      );
      this.simulator.fastForward(msg.nframe);
    } else {
      // How fast do we want to get to server's time
      this.latencySolvingFrames = 30;

      var newLatencySolving =
        toMs(framesDifference) / this.latencySolvingFrames;
      this.latencySolving = this.latencySolving * 0.5 + newLatencySolving * 0.5;
      this.latencyMs = toMs(now - msg.oframe);
    }
  }

  handleGameInput({ frame, clientid, input }) {
    this.simulator.insertEvent(frame, {
      type: "game-input",
      input,
      clientid,
    });
  }

  handleConnect({ frame, clientid }) {
    this.simulator.insertEvent(frame, {
      type: "connect",
      clientid,
    });
  }

  handleDisconnect({ frame, clientid }) {
    this.simulator.insertEvent(frame, {
      type: "disconnect",
      clientid,
    });
  }

  update() {
    if (this.latencySolvingFrames > 0) {
      this.latencySolvingFrames--;
      if (this.latencySolvingFrames === 0) {
        this.latencySolving = 0;
      }
    }
    this.gameupdateTimeout = setTimeout(
      this.update.bind(this),
      this.defaultgamerate + this.latencySolving
    );
    this.simulator.advanceToNextMoment();
  }
  synchronizeTime() {
    this.messenger.send({
      type: "syn",
      frame: this.simulator.getCurrentFrame(),
    });
  }
  gameInput(input) {
    const clientid = this.clientid;
    const frame = this.simulator.getCurrentFrame();
    this.simulator.insertEvent(frame, {
      type: "game-input",
      input,
      clientid,
    });
    this.messenger.send({
      type: "game-input",
      frame,
      input,
    });
  }
  stop() {
    clearTimeout(this.gameupdateTimeout);
    clearInterval(this.syninterval);
  }
}

NetworkClient.STATUS_ACTIVE = 0;
NetworkClient.STATUS_INITIALIZING = 1;
NetworkClient.STATUS_RESETTING = 2;

module.exports = {
  NetworkClient
}
