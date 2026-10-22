/** Cancel superseded reads; synchronous ownership also guards repeated writes. */
export class RequestScope {
  private active: AbortController | null = null;

  get pending() { return this.active !== null; }

  replace(): AbortSignal {
    this.cancel();
    this.active = new AbortController();
    return this.active.signal;
  }

  tryStart(): AbortSignal | null {
    return this.pending ? null : this.replace();
  }

  owns(signal: AbortSignal) {
    return this.active?.signal === signal && !signal.aborted;
  }

  finish(signal: AbortSignal) {
    if (this.active?.signal === signal) this.active = null;
  }

  cancel() {
    this.active?.abort();
    this.active = null;
  }
}
