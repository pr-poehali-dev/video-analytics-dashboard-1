import { useEffect, useState, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { API_URL } from '@/api/client';
import { camerasApi, Camera } from '@/api/cameras';
import { eventsApi, AppEvent } from '@/api/events';
import { facesApi } from '@/api/faces';

const eventStyle = (type: string) => {
  const t = (type || '').toLowerCase();
  if (t.includes('наруш') || t.includes('violat') || t.includes('alert'))
    return { color: 'text-neon-red', label: 'Нарушение', icon: 'TriangleAlert' };
  if (t.includes('вход') || t.includes('enter') || t.includes('in'))
    return { color: 'text-neon-lime', label: 'Вход', icon: 'LogIn' };
  if (t.includes('выход') || t.includes('exit') || t.includes('out'))
    return { color: 'text-neon-blue', label: 'Выход', icon: 'LogOut' };
  return { color: 'text-neon-cyan', label: type || '—', icon: 'Activity' };
};

const Panel = ({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <section className="glass clip-corner neon-border relative overflow-hidden">
    <div className="flex items-center justify-between border-b border-border px-5 py-3">
      <h2 className="flex items-center gap-2 text-sm font-display uppercase tracking-widest text-neon-cyan">
        <Icon name={icon} size={16} /> {title}
      </h2>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </section>
);

export default function Index() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [online, setOnline] = useState<boolean | null>(null);

  const [checkingPing, setCheckingPing] = useState(false);

  const handlePing = async () => {
    setCheckingPing(true);
    try {
      await fetch(API_URL + '/');
      setOnline(true);
      toast.success('Сервер доступен');
    } catch {
      setOnline(false);
      toast.error('Сервер недоступен');
    } finally {
      setCheckingPing(false);
    }
  };

  const [camName, setCamName] = useState('');
  const [camUrl, setCamUrl] = useState('');
  const [loadingCam, setLoadingCam] = useState(false);
  const [loadingFace, setLoadingFace] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [camOpen, setCamOpen] = useState(false);
  const [faceOpen, setFaceOpen] = useState(false);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [faces, setFaces] = useState<string[]>([]);

  const loadCameras = useCallback(async () => {
    try {
      const data = await camerasApi.list();
      setCameras(Array.isArray(data) ? data : []);
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const data = await eventsApi.list();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      /* silent */
    }
  }, []);

  const loadFaces = useCallback(async () => {
    try {
      const data = await facesApi.list();
      if (data.length) setFaces(data);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    loadCameras();
    loadEvents();
    loadFaces();
    const id = setInterval(loadEvents, 5000);
    return () => clearInterval(id);
  }, [loadCameras, loadEvents, loadFaces]);

  const handleAddCamera = async () => {
    if (!camName || !camUrl) return toast.error('Заполните название и RTSP URL');
    setLoadingCam(true);
    try {
      await camerasApi.add(camName, camUrl);
      toast.success('Камера добавлена');
      setCamName('');
      setCamUrl('');
      setCamOpen(false);
      loadCameras();
    } catch {
      toast.error('Не удалось добавить камеру');
    } finally {
      setLoadingCam(false);
    }
  };

  const handleUploadFace = async () => {
    if (!faceFile) return toast.error('Выберите файл');
    setLoadingFace(true);
    try {
      await facesApi.upload(faceFile);
      toast.success('Фото сотрудника загружено');
      setFaces((p) => [faceFile.name, ...p]);
      setFaceFile(null);
      setFaceOpen(false);
    } catch {
      toast.error('Ошибка загрузки фото');
    } finally {
      setLoadingFace(false);
    }
  };

  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingVideo(true);
    try {
      await camerasApi.uploadVideo(file);
      toast.success('Видео загружено');
    } catch {
      toast.error('Ошибка загрузки видео');
    } finally {
      setLoadingVideo(false);
      e.target.value = '';
    }
  };

  const stats = [
    { label: 'Камеры', value: cameras.length, icon: 'Cctv', color: 'text-neon-cyan' },
    { label: 'События', value: events.length, icon: 'Zap', color: 'text-neon-lime' },
    { label: 'Сотрудники', value: faces.length, icon: 'Users', color: 'text-neon-blue' },
  ];

  return (
    <div className="min-h-screen scanline">
      <header className="border-b border-border glass sticky top-0 z-20">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center clip-corner bg-neon-cyan/10 neon-border">
              <Icon name="ScanEye" size={22} className="text-neon-cyan" />
            </div>
            <div>
              <h1 className="text-lg font-display font-black neon-text text-neon-cyan leading-none">
                NEUROVISION
              </h1>
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground">
                Control Center
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span
              className={`h-2 w-2 rounded-full live-dot ${
                online ? 'bg-neon-lime' : online === false ? 'bg-neon-red' : 'bg-muted-foreground'
              }`}
            />
            <span className="text-muted-foreground">
              {online ? 'SERVER ONLINE' : online === false ? 'OFFLINE' : 'CONNECTING…'}
            </span>
            <span className="ml-3 hidden text-muted-foreground/60 md:inline">{API_URL}</span>
            <button
              onClick={handlePing}
              disabled={checkingPing}
              className="ml-2 flex items-center gap-1.5 rounded border border-neon-cyan/30 px-2.5 py-1 text-[11px] uppercase tracking-wider text-neon-cyan hover:bg-neon-cyan/10 disabled:opacity-50 transition-colors"
            >
              {checkingPing
                ? <Icon name="LoaderCircle" size={12} className="animate-spin" />
                : <Icon name="Radio" size={12} />}
              Пинг
            </button>
          </div>
        </div>
      </header>

      <main className="container space-y-6 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="glass clip-corner neon-border animate-sweep relative overflow-hidden p-5 animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className={`font-display text-4xl font-black ${s.color}`}>
                    {String(s.value).padStart(2, '0')}
                  </div>
                  <div className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    {s.label}
                  </div>
                </div>
                <Icon name={s.icon} size={40} className={`${s.color} opacity-30`} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel
            title="Сотрудники"
            icon="UserRound"
            action={
              <Dialog open={faceOpen} onOpenChange={setFaceOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1 border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10">
                    <Icon name="Upload" size={14} /> Фото
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass border-neon-cyan/30">
                  <DialogHeader>
                    <DialogTitle className="font-display text-neon-cyan">Загрузить фото сотрудника</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <Label className="font-mono text-xs">Изображение лица</Label>
                    <Input type="file" accept="image/*" onChange={(e) => setFaceFile(e.target.files?.[0] || null)} />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleUploadFace} disabled={loadingFace} className="bg-neon-cyan text-background hover:bg-neon-cyan/80">
                      {loadingFace ? <Icon name="LoaderCircle" size={16} className="animate-spin" /> : 'Загрузить'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            }
          >
            {faces.length === 0 ? (
              <p className="py-6 text-center font-mono text-xs text-muted-foreground">
                Нет загруженных в этой сессии. Загрузите фото в /known_people.
              </p>
            ) : (
              <ul className="space-y-2">
                {faces.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 rounded border border-border bg-secondary/40 px-3 py-2 font-mono text-sm animate-fade-up">
                    <Icon name="UserCheck" size={16} className="text-neon-lime" />
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Камеры и видео"
            icon="Cctv"
            action={
              <div className="flex gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-neon-lime/40 px-3 py-1.5 text-xs font-medium text-neon-lime hover:bg-neon-lime/10">
                  {loadingVideo ? (
                    <Icon name="LoaderCircle" size={14} className="animate-spin" />
                  ) : (
                    <Icon name="Film" size={14} />
                  )}
                  Видео
                  <input type="file" accept="video/*" className="hidden" onChange={handleUploadVideo} />
                </label>
                <Dialog open={camOpen} onOpenChange={setCamOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1 border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10">
                      <Icon name="Plus" size={14} /> Камера
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass border-neon-cyan/30">
                    <DialogHeader>
                      <DialogTitle className="font-display text-neon-cyan">Добавить камеру</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                      <div className="space-y-1">
                        <Label className="font-mono text-xs">Название</Label>
                        <Input value={camName} onChange={(e) => setCamName(e.target.value)} placeholder="Cam-01 / Вход" />
                      </div>
                      <div className="space-y-1">
                        <Label className="font-mono text-xs">RTSP URL</Label>
                        <Input value={camUrl} onChange={(e) => setCamUrl(e.target.value)} placeholder="rtsp://..." className="font-mono" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddCamera} disabled={loadingCam} className="bg-neon-cyan text-background hover:bg-neon-cyan/80">
                        {loadingCam ? <Icon name="LoaderCircle" size={16} className="animate-spin" /> : 'Добавить'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            }
          >
            {cameras.length === 0 ? (
              <p className="py-6 text-center font-mono text-xs text-muted-foreground">Камеры не подключены</p>
            ) : (
              <ul className="space-y-2">
                {cameras.map((c, i) => (
                  <li key={c.id ?? i} className="flex items-center gap-3 rounded border border-border bg-secondary/40 px-3 py-2 animate-fade-up">
                    <span className="h-2 w-2 rounded-full bg-neon-lime live-dot" />
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-sm text-foreground">{c.name}</div>
                      <div className="truncate font-mono text-[11px] text-muted-foreground">{c.rtsp_url}</div>
                    </div>
                    <Icon name="Cctv" size={16} className="text-neon-cyan" />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel
          title="События · Логи"
          icon="ScrollText"
          action={
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-neon-lime">
              <span className="h-1.5 w-1.5 rounded-full bg-neon-lime live-dot" /> live · 5s
            </span>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  <th className="pb-2 pr-4">Сотрудник</th>
                  <th className="pb-2 pr-4">Тип</th>
                  <th className="pb-2 pr-4">Детали</th>
                  <th className="pb-2">Время</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center font-mono text-xs text-muted-foreground">
                      Событий пока нет
                    </td>
                  </tr>
                ) : (
                  events
                    .slice()
                    .reverse()
                    .map((ev, i) => {
                      const st = eventStyle(ev.event_type);
                      return (
                        <tr key={ev.id ?? i} className="border-b border-border/40 hover:bg-secondary/30">
                          <td className="py-2.5 pr-4 font-medium">{ev.name || '—'}</td>
                          <td className="py-2.5 pr-4">
                            <span className={`inline-flex items-center gap-1.5 font-mono text-xs ${st.color}`}>
                              <Icon name={st.icon} size={13} /> {st.label}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 text-muted-foreground">{ev.details || '—'}</td>
                          <td className="py-2.5 font-mono text-xs text-muted-foreground">
                            {ev.time || ev.timestamp || '—'}
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </main>

      <footer className="container py-6 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/50">
        Neurovision · video analytics control system
      </footer>
    </div>
  );
}