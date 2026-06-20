import { api } from './client';

export interface AppEvent {
  id?: number | string;
  name: string;
  event_type: string;
  details?: string;
  time?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export const eventsApi = {
  list: () => api.get<AppEvent[]>('/events'),
  add: (name: string, event_type: string, details: string) =>
    api.postJson<AppEvent>('/add_event', { name, event_type, details }),
};
