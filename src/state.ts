import { StatusUpdate } from './oven';

export type State = {
  status: StatusUpdate[];
  activeProfile: string | undefined;
};

export const state: State = {
  status: [],
  activeProfile: undefined,
};
