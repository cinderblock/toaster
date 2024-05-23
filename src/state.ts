import { StatusUpdate } from './oven.js';

export type State = {
  status: StatusUpdate[];
  activeProfile: string | undefined;
};

export const state: State = {
  status: [],
  activeProfile: undefined,
};
