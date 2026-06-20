import { api } from './client';

export interface Camera {
  id?: number | string;
  name: string;
  rtsp_url: string;
  [key: string]: unknown;
}

export const camerasApi = {
  list: () => api.get<Camera[]>('/cameras'),
  add: (name: string, rtsp_url: string) =>
    api.postJson<Camera>('/add_camera', { name, rtsp_url }),
  uploadVideo: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.postForm<unknown>('/upload_video', form);
  },
};
