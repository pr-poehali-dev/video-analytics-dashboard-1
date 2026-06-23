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
import { api } from '@/api/client';
import { camerasApi, Camera } from '@/api/cameras';
import { eventsApi, AppEvent } from '@/api/events';
import { facesApi } from '@/api/faces';

/* ── helpers ── */
const eventMeta = (type: string) => {
  const t = (type || '').toLowerCase();
  if (t.includes('наруш') || t.includes('violat') || t.includes('alert'))
    return { color: 'text-red-500', bg: 'bg-red-50', dot: 'bg-red-400', label: 'Нарушение', icon: 'TriangleAlert' };
  if (t.includes('вход') || t.includes('enter') || t.includes('in'))
    return { color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-400', label: 'Вход', icon: 'LogIn' };
  if (t.includes('выход') || t.includes('exit') || t.includes('out'))
    return { color: 'text-orange-500', bg: 'bg-orange-50', dot: 'bg-orange-400', label: 'Выход', icon: 'LogOut' };
  return { color: 'text-brand', bg: 'bg-brand-light', dot: 'bg-brand', label: type || '—', icon: 'Activity' };
};

/* ── Card ── */
const Card = ({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div className={`bg-white rounded-2xl card-shadow p-6 ${className}`} style={style}>{children}</div>
);

/* ── Section header ── */
const SectionHead = ({ icon, title, action }: { icon: string; title: string; action?: React.ReactNode }) => (
  <div className="flex items-center justify-between mb-5">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 blue-gradient rounded-xl flex items-center justify-center">
        <Icon name={icon} size={16} className="text-white" />
      </div>
      <h2 className="text-base font-bold text-foreground">{title}</h2>
    </div>
    {action}
  </div>
);

export default function Index() {
  const [cameras, setCameras]   = useState<Camera[]>([]);
  const [events, setEvents]     = useState<AppEvent[]>([]);
  const [faces, setFaces]       = useState<{ name: string; position: string; filename: string }[]>([]);
  const [online, setOnline]     = useState<boolean | null>(null);
  const [checkingPing, setCheckingPing] = useState(false);

  const [camName, setCamName]   = useState('');
  const [camUrl, setCamUrl]     = useState('');
  const [camOpen, setCamOpen]   = useState(false);
  const [faceOpen, setFaceOpen] = useState(false);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [faceName, setFaceName] = useState('');
  const [facePosition, setFacePosition] = useState('');

  const [loadingCam, setLoadingCam]   = useState(false);
  const [loadingFace, setLoadingFace] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(false);

  /* ── loaders ── */
  const loadCameras = useCallback(async () => {
    try { setCameras(Array.isArray(await camerasApi.list() ) ? await camerasApi.list() : []); setOnline(true); }
    catch { setOnline(false); }
  }, []);

  const loadEvents = useCallback(async () => {
    try { const d = await eventsApi.list(); setEvents(Array.isArray(d) ? d : []); } catch { /* silent */ }
  }, []);

  const loadFaces = useCallback(async () => {
    try {
      const d = await facesApi.list();
      if (d.length) setFaces(d.map(f => ({ name: f, position: '', filename: f })));
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadCameras(); loadEvents(); loadFaces();
    const id = setInterval(loadEvents, 5000);
    return () => clearInterval(id);
  }, [loadCameras, loadEvents, loadFaces]);

  /* ── actions ── */
  const handlePing = async () => {
    setCheckingPing(true);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    try {
      await fetch(api.pingUrl(), { signal: ctrl.signal });
      setOnline(true); toast.success('Сервер доступен');
    } catch {
      setOnline(false); toast.error('Сервер недоступен');
    } finally { clearTimeout(t); setCheckingPing(false); }
  };

  const handleAddCamera = async () => {
    if (!camName || !camUrl) return toast.error('Заполните название и RTSP URL');
    setLoadingCam(true);
    try {
      await camerasApi.add(camName, camUrl);
      toast.success('Камера добавлена'); setCamName(''); setCamUrl(''); setCamOpen(false); loadCameras();
    } catch { toast.error('Не удалось добавить камеру'); }
    finally { setLoadingCam(false); }
  };

  const handleUploadFace = async () => {
    if (!faceName.trim()) return toast.error('Введите ФИО сотрудника');
    if (!faceFile) return toast.error('Выберите фото');
    setLoadingFace(true);
    try {
      await facesApi.upload(faceFile);
      toast.success('Сотрудник добавлен');
      setFaces(p => [{ name: faceName.trim(), position: facePosition.trim(), filename: faceFile.name }, ...p]);
      setFaceFile(null); setFaceName(''); setFacePosition(''); setFaceOpen(false);
    } catch { toast.error('Ошибка загрузки'); }
    finally { setLoadingFace(false); }
  };

  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setLoadingVideo(true);
    try { await camerasApi.uploadVideo(file); toast.success('Видео загружено'); }
    catch { toast.error('Ошибка загрузки видео'); }
    finally { setLoadingVideo(false); e.target.value = ''; }
  };

  const statCards = [
    { label: 'Камеры',      value: cameras.length, icon: 'Cctv',  gradient: 'from-blue-500 to-blue-400' },
    { label: 'События',     value: events.length,  icon: 'Zap',   gradient: 'from-violet-500 to-violet-400' },
    { label: 'Сотрудники',  value: faces.length,   icon: 'Users', gradient: 'from-sky-400 to-cyan-400' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ── HEADER ── */}
      <header className="bg-white border-b border-border sticky top-0 z-20 card-shadow">
        <div className="container flex items-center justify-between py-3.5">
          {/* logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 blue-gradient rounded-2xl flex items-center justify-center shadow-md">
              <Icon name="ScanEye" size={20} className="text-white" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium leading-none mb-0.5 uppercase tracking-wider">Видеоаналитика</p>
              <h1 className="text-lg font-bold leading-none text-foreground">Панель управления</h1>
            </div>
          </div>

          {/* status + ping */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-secondary rounded-full px-3 py-1.5">
              <span className={`w-2 h-2 rounded-full live-ring ${online ? 'bg-success' : online === false ? 'bg-destructive' : 'bg-muted-foreground'}`} />
              <span className="text-xs font-medium text-muted-foreground">
                {online ? 'Онлайн' : online === false ? 'Офлайн' : 'Подключение…'}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePing}
              disabled={checkingPing}
              className="rounded-xl gap-1.5 border-border"
            >
              {checkingPing
                ? <Icon name="LoaderCircle" size={14} className="animate-spin" />
                : <Icon name="Radio" size={14} />}
              Пинг
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-6">

        {/* ── STATS ── */}
        <div className="grid gap-4 sm:grid-cols-3">
          {statCards.map((s, i) => (
            <Card
              key={s.label}
              className="animate-fade-up flex items-center gap-5"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-md flex-shrink-0`}>
                <Icon name={s.icon} size={26} className="text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground leading-none">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* ── EMPLOYEES + CAMERAS ── */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Сотрудники */}
          <Card>
            <SectionHead
              icon="UserRound"
              title="Сотрудники"
              action={
                <Dialog open={faceOpen} onOpenChange={open => { setFaceOpen(open); if (!open) { setFaceName(''); setFacePosition(''); setFaceFile(null); } }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="rounded-xl gap-1.5 blue-gradient text-white border-0 shadow-sm">
                      <Icon name="UserPlus" size={14} /> Добавить сотрудника
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-bold">Новый сотрудник</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">ФИО <span className="text-destructive">*</span></Label>
                        <Input
                          value={faceName}
                          onChange={e => setFaceName(e.target.value)}
                          placeholder="Иванов Иван Иванович"
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Должность</Label>
                        <Input
                          value={facePosition}
                          onChange={e => setFacePosition(e.target.value)}
                          placeholder="Менеджер, охранник…"
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Фото лица <span className="text-destructive">*</span></Label>
                        <Input
                          type="file" accept="image/*"
                          className="rounded-xl"
                          onChange={e => setFaceFile(e.target.files?.[0] || null)}
                        />
                        <p className="text-xs text-muted-foreground">Фото используется для распознавания в системе</p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleUploadFace} disabled={loadingFace} className="rounded-xl blue-gradient text-white border-0 w-full">
                        {loadingFace ? <Icon name="LoaderCircle" size={16} className="animate-spin" /> : 'Добавить сотрудника'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              }
            />
            {faces.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-14 h-14 blue-gradient-soft rounded-2xl flex items-center justify-center mb-3">
                  <Icon name="Users" size={28} className="text-brand" />
                </div>
                <p className="text-sm font-medium text-foreground">Сотрудники не загружены</p>
                <p className="text-xs text-muted-foreground mt-1">Нажмите «Добавить сотрудника» выше</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {faces.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3 animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="w-9 h-9 blue-gradient rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                      {f.name ? f.name.charAt(0).toUpperCase() : <Icon name="User" size={15} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{f.name || f.filename}</p>
                      {f.position && <p className="text-xs text-muted-foreground truncate">{f.position}</p>}
                    </div>
                    <Icon name="CheckCircle" size={16} className="text-success flex-shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Камеры */}
          <Card>
            <SectionHead
              icon="Cctv"
              title="Камеры и видео"
              action={
                <div className="flex gap-2">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
                    {loadingVideo
                      ? <Icon name="LoaderCircle" size={13} className="animate-spin" />
                      : <Icon name="Film" size={13} />}
                    Видео
                    <input type="file" accept="video/*" className="hidden" onChange={handleUploadVideo} />
                  </label>
                  <Dialog open={camOpen} onOpenChange={setCamOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="rounded-xl gap-1.5 blue-gradient text-white border-0 shadow-sm">
                        <Icon name="Plus" size={14} /> Камера
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Добавить камеру</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Название</Label>
                          <Input value={camName} onChange={e => setCamName(e.target.value)} placeholder="Cam-01 / Вход" className="rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">RTSP URL</Label>
                          <Input value={camUrl} onChange={e => setCamUrl(e.target.value)} placeholder="rtsp://..." className="rounded-xl font-mono text-sm" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleAddCamera} disabled={loadingCam} className="rounded-xl blue-gradient text-white border-0">
                          {loadingCam ? <Icon name="LoaderCircle" size={16} className="animate-spin" /> : 'Добавить'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              }
            />
            {cameras.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-14 h-14 blue-gradient-soft rounded-2xl flex items-center justify-center mb-3">
                  <Icon name="Cctv" size={28} className="text-brand" />
                </div>
                <p className="text-sm font-medium text-foreground">Камеры не подключены</p>
                <p className="text-xs text-muted-foreground mt-1">Добавьте камеру через кнопку выше</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {cameras.map((c, i) => (
                  <li key={c.id ?? i} className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3 animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="w-2 h-2 rounded-full bg-success live-ring flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">{c.rtsp_url}</p>
                    </div>
                    <Icon name="Cctv" size={16} className="text-brand flex-shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* ── EVENTS ── */}
        <Card>
          <SectionHead
            icon="ScrollText"
            title="События и логи"
            action={
              <div className="flex items-center gap-2 bg-green-50 rounded-full px-3 py-1.5">
                <span className="w-2 h-2 rounded-full bg-success live-ring" />
                <span className="text-xs font-medium text-green-700">Авто-обновление · 5 сек</span>
              </div>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="text-left pb-3 pr-4">Сотрудник</th>
                  <th className="text-left pb-3 pr-4">Тип события</th>
                  <th className="text-left pb-3 pr-4">Детали</th>
                  <th className="text-left pb-3">Время</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-14 h-14 blue-gradient-soft rounded-2xl flex items-center justify-center mb-3">
                          <Icon name="ClipboardList" size={28} className="text-brand" />
                        </div>
                        <p className="text-sm font-medium text-foreground">Событий пока нет</p>
                        <p className="text-xs text-muted-foreground mt-1">Данные обновляются каждые 5 секунд</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  events.slice().reverse().map((ev, i) => {
                    const m = eventMeta(ev.event_type);
                    return (
                      <tr key={ev.id ?? i} className="hover:bg-secondary/50 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 blue-gradient-soft rounded-lg flex items-center justify-center flex-shrink-0">
                              <Icon name="User" size={13} className="text-brand" />
                            </div>
                            <span className="text-sm font-semibold">{ev.name || '—'}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${m.bg} ${m.color}`}>
                            <Icon name={m.icon} size={12} /> {m.label}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">{ev.details || '—'}</td>
                        <td className="py-3 text-xs text-muted-foreground font-mono">{ev.time || ev.timestamp || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      <footer className="container pb-8 text-center text-xs text-muted-foreground">
        Система видеоаналитики · 72.56.35.26:8000
      </footer>
    </div>
  );
}