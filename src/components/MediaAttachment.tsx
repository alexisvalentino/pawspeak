import { useEffect, useId, useRef, useState } from 'react';

export interface MediaPreview { file: File; url: string; kind: 'video' | 'audio' }
export function MediaAttachment({ media, onChange, consent, onConsent }: {
  media: MediaPreview | null; onChange: (media: MediaPreview | null) => void;
  consent: boolean; onConsent: (consent: boolean) => void;
}) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputId = `media-${useId()}`;
  const input = useRef<HTMLInputElement>(null);
  const mediaRef = useRef(media);
  const requestRef = useRef(0);
  mediaRef.current = media;
  useEffect(() => () => { if (mediaRef.current) URL.revokeObjectURL(mediaRef.current.url); }, []);
  const handleFile = async (file?: File) => {
    if (!file) return;
    setError('');
    if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) { setError('Choose an audio or video file. Still images cannot show movement.'); return; }
    if (file.size > 50 * 1024 * 1024) { setError('Choose a file smaller than 50 MB.'); return; }
    if (!consent) { setError('Review and accept local media processing before adding a file.'); return; }
    const requestId = ++requestRef.current;
    setLoading(true);
    const url = URL.createObjectURL(file);
    const kind = file.type.startsWith('video/') ? 'video' : 'audio';
    try {
      const duration = await new Promise<number>((resolve, reject) => {
        const element = document.createElement(kind);
        element.preload = 'metadata';
        element.src = url;
        element.onloadedmetadata = () => resolve(element.duration);
        element.onerror = () => reject(new Error('Metadata unavailable'));
      });
      if (!Number.isFinite(duration) || duration > 15) throw new Error('Choose a clip no longer than 15 seconds.');
      if (requestId !== requestRef.current) { URL.revokeObjectURL(url); return; }
      if (media) URL.revokeObjectURL(media.url);
      onChange({ file, url, kind });
    } catch (error) {
      URL.revokeObjectURL(url);
      if (requestId !== requestRef.current) return;
      setError(error instanceof Error ? error.message : 'Could not preview this file. Choose a browser-supported audio or video clip.');
    } finally { if (requestId === requestRef.current) setLoading(false); if (input.current) input.current.value = ''; }
  };
  return <section className="section-block">
    <h2 className="heading-md">Media (optional)</h2>
    <p className="body-secondary mt-1">Attach a short clip for your own review. No model analysis is enabled yet.</p>
    <label className="consent-row">
      <input type="checkbox" className="w-5 h-5 shrink-0" checked={consent} onChange={e => { onConsent(e.target.checked); if (!e.target.checked && media) { URL.revokeObjectURL(media.url); onChange(null); } }} />
      <span className="text-sm leading-5">I consent to loading this clip in PawSpeak on this device for preview. It will not be uploaded or saved with this observation.</span>
    </label>
    <div className="flex flex-wrap items-center gap-2 mt-3">
      <input aria-label="Choose audio or video clip" ref={input} className="sr-only" type="file" id={fileInputId} accept="video/*,audio/*" disabled={!consent || loading} onChange={e => void handleFile(e.target.files?.[0])} />
      <label htmlFor={fileInputId} className={`button-secondary ${!consent || loading ? 'opacity-50 pointer-events-none' : ''}`}>{loading ? 'Checking clip…' : media ? 'Replace clip' : 'Choose audio or video'}</label>
      <span className="body-secondary">Up to 15 seconds and 50 MB</span>
    </div>
    {error && <p role="alert" className="error-text">{error}</p>}
    {media && <div className="media-preview">
      {media.kind === 'video' ? <video src={media.url} controls playsInline className="max-h-64 w-full bg-slate-950" /> : <audio src={media.url} controls className="w-full" />}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3"><span className="text-sm font-semibold truncate">{media.file.name}</span>
        <button type="button" className="button-text" onClick={() => { URL.revokeObjectURL(media.url); onChange(null); if (input.current) input.current.value = ''; }}>Remove clip</button></div>
    </div>}
    <p className="body-secondary mt-2">To record a new clip, use your device camera or microphone app, then choose it here. A future version may add direct recording with the same consent and duration limits.</p>
  </section>;
}
