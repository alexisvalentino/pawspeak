import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, LoaderCircle, Mic, Volume2 } from 'lucide-react';
import { getSoundEventClassifier } from '../ml/soundEventRuntime';
import type { SoundEventCandidate } from '../ml/soundEvents';

type SoundCheckState = 'idle' | 'recording' | 'analyzing' | 'done' | 'error';
const SAMPLE_SECONDS = 4;

export function SoundCueCheck() {
  const [state, setState] = useState<SoundCheckState>('idle');
  const [expanded, setExpanded] = useState(false);
  const [candidates, setCandidates] = useState<SoundEventCandidate[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const headingId = useId();
  const contentId = useId();
  const jobRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    jobRef.current += 1;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    void audioContextRef.current?.close();
  }, []);

  const checkSounds = async () => {
    if (!window.isSecureContext) {
      setState('error');
      setErrorMessage('Microphone access requires an HTTPS page. Open PawSpeak from its secure address and try again.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined'
      || typeof AudioContext === 'undefined' || typeof OfflineAudioContext === 'undefined') {
      setState('error');
      setErrorMessage('This browser does not support the microphone recording tools needed for a sound check.');
      return;
    }

    const job = ++jobRef.current;
    setState('recording');
    setCandidates([]);
    setErrorMessage('');
    let context: AudioContext | null = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (job !== jobRef.current || document.hidden) {
        stream.getTracks().forEach(track => track.stop());
        if (job === jobRef.current) setState('idle');
        return;
      }
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      const chunks: BlobPart[] = [];
      const clip = new Promise<Blob>((resolve, reject) => {
        recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
        recorder.onerror = () => reject(new Error('The microphone sample could not be recorded.'));
        recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
        recorder.start();
        timerRef.current = window.setTimeout(() => {
          if (recorder.state === 'recording') recorder.stop();
        }, SAMPLE_SECONDS * 1_000);
      });
      const blob = await clip;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      stream.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      if (job !== jobRef.current) return;
      if (!blob.size) throw new Error('No audio was captured. Check microphone permission and try again.');

      setState('analyzing');
      context = new AudioContext();
      audioContextRef.current = context;
      const decoded = await context.decodeAudioData(await blob.arrayBuffer());
      const sampleLength = Math.max(1, Math.round(decoded.duration * 16_000));
      const resampler = new OfflineAudioContext(1, sampleLength, 16_000);
      const source = resampler.createBufferSource();
      source.buffer = decoded;
      source.connect(resampler.destination);
      source.start();
      const normalized = await resampler.startRendering();
      const waveform = normalized.getChannelData(0).slice();
      if (job !== jobRef.current) return;
      const classifier = await getSoundEventClassifier();
      const result = await classifier.classify(waveform);
      if (job === jobRef.current) {
        setCandidates(result);
        setState('done');
      }
    } catch (error) {
      if (job === jobRef.current) {
        setState('error');
        const name = error instanceof Error ? error.name : '';
        setErrorMessage(name === 'NotAllowedError' || name === 'PermissionDeniedError'
          ? 'Microphone access was declined. Allow it in the browser if you want to try a sound check.'
          : error instanceof Error ? error.message : 'The sound check could not run. Try again.');
      }
    } finally {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      if (context && context.state !== 'closed') await context.close();
      if (audioContextRef.current === context) audioContextRef.current = null;
    }
  };

  const cancelSounds = () => {
    jobRef.current += 1;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setState('idle');
    setErrorMessage('');
  };

  useEffect(() => {
    const stopWhenHidden = () => {
      if (document.hidden && recorderRef.current?.state === 'recording') cancelSounds();
    };
    document.addEventListener('visibilitychange', stopWhenHidden);
    return () => document.removeEventListener('visibilitychange', stopWhenHidden);
  }, []);

  const busy = state === 'recording' || state === 'analyzing';
  const isExpanded = expanded || busy;
  return <section className="sound-cue-check" aria-labelledby={headingId}>
    <button className="sound-cue-toggle" type="button" aria-expanded={isExpanded} aria-controls={contentId} aria-disabled={busy}
      onClick={() => { if (!busy) setExpanded(value => !value); }}>
      <span className="sound-cue-icon"><Volume2 aria-hidden="true" /></span>
      <span className="sound-cue-summary-copy"><strong id={headingId}>Optional sound check</strong><small>Check for nearby pet sounds on this device</small></span>
      <ChevronDown className="sound-cue-toggle-chevron" aria-hidden="true" />
    </button>
    <div className="sound-cue-content" id={contentId} hidden={!isExpanded}>
      <p className="sound-cue-privacy">When you tap Check, PawSpeak records about four seconds. The clip stays in memory on this device and is discarded after analysis. The model downloads the first time you use this check.</p>
      <button className="btn-secondary sound-cue-button" type="button" onClick={() => void checkSounds()} disabled={busy}>
        {busy ? <LoaderCircle className="spin" aria-hidden="true" /> : <Mic aria-hidden="true" />}
        {state === 'recording' ? 'Listening for four seconds…' : state === 'analyzing' ? 'Checking sound…' : 'Check nearby sounds'}
      </button>
      {state === 'recording' && <button className="btn-text sound-cue-cancel" type="button" onClick={cancelSounds}>Stop listening</button>}
      {state === 'done' && <div className="sound-cue-results" aria-live="polite">
        {candidates.length ? <>
          <p>Possible sound events in this sample:</p>
          <ul>{candidates.map(candidate => <li key={candidate.label}><strong>{candidate.label}</strong><span>{Math.round(candidate.score * 100)}% model score</span></li>)}</ul>
        </> : <p>No clear pet vocal sound stood out in this sample. A quiet result does not mean no sound was made.</p>}
        <small>These general sound-event scores are not calibrated confidence and do not tell us how an animal feels or what it wants.</small>
      </div>}
      {state === 'error' && <p className="sound-cue-error" role="alert">{errorMessage}</p>}
    </div>
  </section>;
}
