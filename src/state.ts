// Caution importing non-types from non-ui code
import { ProfileID, StatusUpdate } from './oven.js';

export type State = {
  status: StatusUpdate[];
  activeProfile: ProfileID | undefined;
};

export const state: State = {
  status: [],
  activeProfile: undefined,
};
