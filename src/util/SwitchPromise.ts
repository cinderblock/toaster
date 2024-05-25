/**
 * Create a thing that acts like a switch.
 *
 * You can await a particular state change, or the next state change, or trigger the next state change.
 *
 * @note I have a feeling I just recreated Generators...
 */
export class SwitchPromise<T = boolean> {
  private resolve: (v: T) => void;
  private change: Promise<T>;

  constructor(private value?: T) {
    // Prevent warning about missing initializer
    this.resolve = () => {
      throw new Error('resolve is not defined?');
    };

    // Create a new promise for the next state change
    this.change = new Promise(resolve => (this.resolve = resolve));
  }

  /**
   * Sets the state
   * @param next New state
   * @returns previous state
   */
  set(next: T) {
    if (next === this.value) return next;

    // Save the old state
    const res = this.resolve;
    const old = this.value;

    // Create a new promise
    this.change = new Promise(resolve => (this.resolve = resolve));

    // Update the state
    this.value = next;

    // Resolve the old promise with the current state
    res(this.value);

    return old;
  }

  get() {
    return this.value;
  }

  /**
   * Await the next state change
   */
  async next(): Promise<T>;
  /**
   * Await the next state change to a specific value, or return now if already that value
   */
  async next(value: T): Promise<T>;
  async next(value?: T) {
    if (!arguments.length) return this.change;

    if (value === this.value) return value;

    await this.change;

    return this.next(value!);
  }
}
