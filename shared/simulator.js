const log = require("./log");
const { stringify: JSONStringify } = require("./deterministic-json");

function addSorted(arr, item, compare) {
  var i;
  for (i = 0; i < arr.length && compare(item, arr[i]) > 0; i++) {}
  arr.splice(i, 0, item);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Simulates a game and holds a history of previous simulations and their inputs.
 * Simulator holds a list of known history in 'this.moments'.
 * Each moment holds the state of the game and the events that have occurred that frame.
 * A new state is calculated from the state and events of the previous moment.
 *
 * moment -- A state and the events that happen in a specific frame.
 * frame -- An incrementing number that is used for identifying a moment in time.
 * state -- A user-specified state of a certain point in time.
 * prehistoric moment -- A moment that is too old to remember (it was disposed).
 */
class Simulator {
  constructor(game) {
    this.futureEvents = [];
    this.moments = [
      {
        events: [],
        state: game.init(),
      },
    ];
    this.game = game;
    this.maxRememberedMoments = Simulator.defaultMaxRememberedMoments;
    assert(this.getCurrentState().frame === 0);
  }

  /**
   * Recalculate all states from specified frame using all existing events.
   */
  recalculateStates(fromframe) {
    var now = this.moments[0].state.frame;
    for (var frame = fromframe; frame < now; frame++) {
      var moment = this.getMoment(frame);
      var newState = this.nextStateFromMoment(moment);
      this.getMoment(frame + 1).state = newState;
    }
  }

  /**
   * Disposes all moments before frame. After calling, all
   * frames before the specified frame will be prehistoric.
   */
  forgetMomentsBefore(frame) {
    while (
      this.moments.length > 1 &&
      this.moments[this.moments.length - 1].state.frame < frame
    ) {
      this.moments.pop();
    }
  }

  /**
   * Calculate the next state from the current state and current events.
   */
  nextStateFromMoment(moment) {
    var newstate = this.game.update(moment.state, moment.events);
    assert(newstate.frame === moment.state.frame + 1);
    return deepFreeze(newstate);
  }

  /**
   * Increments the game one frame.
   * The latest state and events are taken and a new moment is calculated using the update from game. =>
   */
  advanceToNextMoment() {
    // Calculate new moment
    var newstate = this.nextStateFromMoment(this.getCurrentMoment());
    this.moments.unshift({
      events: [],
      state: newstate,
    });

    // Place future (now current) events in the new moment if they were destined to be in that moment/frame.
    while (
      this.futureEvents.length > 0 &&
      newstate.frame === this.futureEvents[0].frame
    ) {
      var futureEvent = this.futureEvents.shift();

      addSorted(
        this.moments[0].events,
        futureEvent.event,
        this.game.compareEvents
      );
    }

    // Only remove frames if maxFramesInHistory is enabled.
    if (this.maxRememberedMoments >= 0) {
      // Remove old moments
      while (this.moments.length > this.maxRememberedMoments) {
        var moment = this.moments.pop();
        log.debug("!STATE:", moment.state.frame, JSONStringify(moment.state));
        moment.events.forEach((event) => {
          log.debug("!EVENT:", moment.state.frame, JSONStringify(event));
        });
      }
    }
  }

  /**
   * Fast-forward to the specified frame: keep advancing the simulator
   * until we're at the specified frame, making sure getCurrentFrame === frame.
   */
  fastForward(frame) {
    log.debug("Fast-forwarding", {
      from: this.getCurrentFrame(),
      to: frame,
    });
    while (this.getCurrentFrame() < frame) {
      this.advanceToNextMoment();
    }
    log.debug("Fast-forwarded", { to: this.getCurrentFrame() });
  }

  /**
   * Push event into current moment, to be used for the next moment.
   */
  pushEvent(event) {
    this.insertEvent(this.getCurrentFrame(), event);
  }

  /*
   * Adds the specified event into the specified frame.
   * If frame is in the future, it will be added to futureEvents.
   * If frame is in known history it will be inserted into that frame and trailing frames will be re-simulated.
   * If frame is prehistoric an error will be thrown.
   */
  insertEvent(frame, event) {
    assert(event);
    var frameIndex = this.getCurrentFrame() - frame;
    if (frameIndex < 0) {
      // Event in the future?
      var index = this.futureEvents.findIndex(
        (futureEvent) => frame < futureEvent.frame
      );
      if (index === -1) {
        index = this.futureEvents.length;
      }
      this.futureEvents.splice(index, 0, {
        frame: frame,
        event: event,
      });
    } else if (frameIndex < this.moments.length) {
      // Event of current frame or the memorized past?
      var moment = this.getMoment(frame);
      addSorted(moment.events, event, this.game.compareEvents);
      this.recalculateStates(frame);
    } else {
      throw new Error(
        "The inserted frame is prehistoric: it is too old to simulate"
      );
    }
  }

  /*
   * Resets the whole simulator state to the specified state and set its futureEvents.
   * Use this in conjuction with fastForward to also simulate the specified events.
   */
  resetState(state, futureEvents) {
    log.debug("Reset state and futureEvents", { state, futureEvents });

    // Reset moments
    this.moments.length = 0;
    this.moments.unshift({
      events: [],
      state: state,
    });

    // Reset futureEvents
    for (var i = 0; i < futureEvents.length; i++) {
      this.insertEvent(futureEvents[i].frame, futureEvents[i].event);
    }
  }

  setState(state) {
    this.moments = [{
      state,
      events: []
    }];
    const events = this.getEvents();
    this.futureEvents = events;
    this.recalculateStates(state.frame);
  }

  getEvents() {
    var events = [];
    for (var i = this.moments.length - 1; i >= 0; i--) {
      var moment = this.moments[i];
      moment.events.forEach((e) => {
        events.push({
          frame: moment.state.frame,
          event: e,
        });
      });
    }
    this.futureEvents.forEach((fe) => {
      events.push(fe);
    });
    return events;
  }

  /**
   * Returns whether the frame is before known history.
   */
  isFramePrehistoric(frame) {
    return frame < this.getOldestFrame();
  }

  /**
   * Returns the moment at the specified frame.
   * A error will be thrown when the frame is in the future or forgotten.
   */
  getMoment(frame) {
    var frameIndex = this.moments[0].state.frame - frame;
    assert(
      frameIndex >= 0,
      `The frame ${frame} was newer than the last frame ${this.moments[0].state.frame}`
    );
    assert(
      frameIndex < this.moments.length,
      `The frame ${frame} was too old! (max ${this.moments.length})`
    );
    return this.moments[frameIndex];
  }

  /**
   * Retrieve the latest moment.
   */
  getCurrentMoment() {
    return this.moments[0];
  }
  getCurrentState() {
    return this.moments[0].state;
  }
  getCurrentFrame() {
    return this.moments[0].state.frame;
  }

  /**
   * Retrieve oldest known moment; The moment just before becoming prehistoric.
   */
  getOldestMoment() {
    return this.moments[this.moments.length - 1].state;
  }
  getOldestState() {
    return this.moments[this.moments.length - 1].state;
  }
  getOldestFrame() {
    return this.moments[this.moments.length - 1].state.frame;
  }
}

/**
 * No maximum of frames: handle frame removal yourself.
 */
Simulator.defaultMaxFramesInHistory = -1

function deepFreeze(object) {
  // Retrieve the property names defined on object
  var propNames = Object.getOwnPropertyNames(object);

  // Freeze properties before freezing self
  for (let name of propNames) {
    let value = object[name];

    if(value && typeof value === "object") { 
      deepFreeze(value);
    }
  }

  return Object.freeze(object);
}

module.exports = {
  Simulator
}