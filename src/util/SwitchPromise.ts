/**
 * Create a thing that acts like a switch.
 *
 * You can await a particular state change, or the next state change, or trigger the next state change.
 */

export class SwitchPromise {
  private resolve: (value: boolean) => void;
  private change: Promise<boolean>;

  constructor(private enabled?: boolean) {
    // Prevent warning about missing initializer
    this.resolve = () => {
      throw new Error('resolve is not defined?');
    };

    // Create a new promise for the next state change
    this.change = new Promise<boolean>(resolve => (this.resolve = resolve));
  }

  /**
   * Sets or toggles the state
   * @param enabled New state
   * @returns previous state
   */
  set(enabled: undefined | boolean = undefined) {
    if (enabled !== undefined && enabled === this.enabled) return enabled;

    // Save the old state
    const res = this.resolve;
    const old = this.enabled;

    // Create a new promise
    this.change = new Promise<boolean>(resolve => (this.resolve = resolve));

    // Update the state
    this.enabled = !old;

    // Resolve the old promise with the current state
    res(this.enabled);

    return old;
  }

  /**
   * Await the next state change
   */
  next(): Promise<boolean>;
  /**
   * Await the next state change to enabled, or return now if already enabled
   */
  next(enabled: true): Promise<true>;
  /**
   * Await the next state change to disabled, or return now if already disabled
   */
  next(enabled: false): Promise<false>;
  next(enabled: undefined | boolean = undefined) {
    if (enabled !== undefined && enabled === this.enabled) return enabled;

    return this.change;
  }
}
