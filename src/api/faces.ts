import { api } from './client';

export const facesApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.postForm<unknown>('/upload_face', form);
  },
  detect: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.postForm<unknown>('/detect', form);
  },
};
