import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, CheckCircle2, CircleDashed, ImagePlus, LoaderCircle, PawPrint, RefreshCw, ShieldCheck, SwitchCamera, X } from 'lucide-react';
import { detectPets, detectScene, getBehaviorClassifier, type BehaviorResult, type PetDetection, type PetKind, type SceneObject } from '../ml/petClassifier';
import { BODY_LANGUAGE } from '../data/bodyLanguage';
import { buildLiveGuidance, sampleLuminance, type GuidanceCheck } from '../ml/liveGuidance';
import { createPetTrackState, projectBoxToCover, updatePetTracks, type PetTrack, type PetTrackState } from '../ml/petTracking';
import { cameraStartErrorMessage, detectorErrorDetails, petDetectorErrorMessage } from '../ml/cameraMessages';
import { requestCameraStream } from '../ml/cameraPermission';
import { ANIMAL_POSE_MODEL_VERSION } from '../ml/animalPose';
import { getAnimalPoseEstimator, type AnimalPoseAnalysis } from '../ml/animalPoseRuntime';
import { PageHeading } from './PageHeading';
import { SoundCueCheck } from './SoundCueCheck';
import { hasVisiblePositionChange, type MotionSample } from '../ml/motionCue';
import { decideLiveFailure } from '../ml/liveDetectionLoop';

type Phase = 'idle' | 'starting' | 'live' | 'analyzing' | 'result' | 'error';
interface Analysis {
  detections: PetDetection[];
  otherObjects: SceneObject[];
  behavior: BehaviorResult | null;
  pose: AnimalPoseAnalysis | null;
  poseStatus: 'ready' | 'unclear' | 'unavailable' | 'unsupported';
}
const animalName = (animal: PetDetection['pet']) => animal[0].toUpperCase() + animal.slice(1);
const POSE_BONES = [[0, 2], [1, 2], [2, 3], [3, 4], [3, 5], [5, 6], [6, 7], [3, 8], [8, 9], [9, 10], [4, 11], [11, 12], [12, 13], [4, 14], [14, 15], [15, 16]] as const;

function cropDetection(source: HTMLCanvasElement, bbox: PetDetection['bbox']): HTMLCanvasElement | null {
  const x = Math.max(0, Math.floor(bbox[0]));
  const y = Math.max(0, Math.floor(bbox[1]));
  const right = Math.min(source.width, Math.ceil(bbox[0] + bbox[2]));
  const bottom = Math.min(source.height, Math.ceil(bbox[1] + bbox[3]));
  if (right <= x || bottom <= y) return null;
  const crop = document.createElement('canvas');
  crop.width = right - x;
  crop.height = bottom - y;
  const context = crop.getContext('2d');
  if (!context) return null;
  context.drawImage(source, x, y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return crop;
}
export function CameraScreen({ onExplore, offlineStatus, initialCameraStreamRef, initialCameraStreamToken }: {
  onExplore: (species: PetKind) => void;
  offlineStatus?: 'ready' | 'preparing' | 'unavailable' | 'development';
  initialCameraStreamRef: { current: MediaStream | null };
  initialCameraStreamToken: number;
}) {
  const [phase, setPhase] = useState<Phase>(() => initialCameraStreamRef.current ? 'starting' : 'idle');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [guidance, setGuidance] = useState<GuidanceCheck[]>([]);
  const [liveTracks, setLiveTracks] = useState<PetTrack[]>([]);
  const [positionChanged, setPositionChanged] = useState(false);
  const [detectorDiagnostic, setDetectorDiagnostic] = useState('');
  const [trackingStatus, setTrackingStatus] = useState<'checking' | 'ready' | 'unavailable'>('checking');
  const [trackingRetry, setTrackingRetry] = useState(0);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef(0);
  const uploadRef = useRef<HTMLInputElement>(null);
  const lastCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const guidanceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tracksRef = useRef<PetTrackState>(createPetTrackState());
  const motionSamplesRef = useRef(new Map<number, MotionSample[]>());
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };
  useEffect(() => {
    const suspend = () => reset();
    const onHide = () => { if (document.hidden) suspend(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pawspeak:suspend-camera', suspend);
    return () => {
      requestRef.current += 1;
      stopCamera();
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pawspeak:suspend-camera', suspend);
    };
  }, []);
  useEffect(() => {
    const stream = initialCameraStreamRef.current;
    if (!stream) return;
    initialCameraStreamRef.current = null;
    const request = ++requestRef.current;
    let active = true;
    setPhase('starting'); setMessage(''); setTrackingStatus('checking');
    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) {
      stream.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setPhase('error'); setMessage('PawSpeak could not prepare the camera preview. Tap Start camera to try again.');
    } else {
      video.srcObject = stream;
      void video.play().then(() => {
        if (!active || request !== requestRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        setPhase('live');
      }).catch(error => {
        if (!active || request !== requestRef.current) return;
        stopCamera(); setPhase('error'); setMessage(cameraStartErrorMessage(error));
      });
    }
    return () => {
      active = false;
      if (request === requestRef.current) requestRef.current += 1;
      if (streamRef.current === stream) stopCamera();
      else stream.getTracks().forEach(track => track.stop());
    };
  }, [initialCameraStreamToken]);
  useEffect(() => {
    if (phase !== 'live') { setGuidance([]); return; }
    let active = true;
    setTrackingStatus('checking');
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    const canvas = guidanceCanvasRef.current ?? document.createElement('canvas');
    guidanceCanvasRef.current = canvas;
    const checkFrame = async () => {
      const video = videoRef.current;
      if (!active || !video) return;
      if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
        setGuidance(buildLiveGuidance(null, null, 0, 0));
        timer = setTimeout(checkFrame, 250);
        return;
      }
      const startedAt = performance.now();
      let brightness: number | null = null;
      try {
        // Reading pixels can fail on a constrained WebView; it must not end the loop.
        brightness = sampleLuminance(video, canvas);
        setGuidance(buildLiveGuidance(null, brightness, video.videoWidth, video.videoHeight));
        const detections = await detectPets(video);
        if (!active) return;
        tracksRef.current = updatePetTracks(tracksRef.current, detections);
        setLiveTracks(tracksRef.current.tracks);
        const now = performance.now();
        const currentIds = new Set<number>();
        let observed = false;
        for (const track of tracksRef.current.tracks) {
          if (track.missedFrames) continue;
          currentIds.add(track.id);
          const samples = motionSamplesRef.current.get(track.id) ?? [];
          samples.push({ time: now, bbox: track.bbox });
          const recent = samples.slice(-5);
          motionSamplesRef.current.set(track.id, recent);
          observed ||= hasVisiblePositionChange(recent);
        }
        for (const id of motionSamplesRef.current.keys()) {
          if (!currentIds.has(id)) motionSamplesRef.current.delete(id);
        }
        if (observed) setPositionChanged(true);
        setGuidance(buildLiveGuidance(detections, brightness, video.videoWidth, video.videoHeight));
        failures = 0;
        setTrackingStatus('ready');
        setDetectorDiagnostic('');
        timer = setTimeout(checkFrame, Math.max(200, 900 - (performance.now() - startedAt)));
      } catch (error) {
        if (!active) return;
        const decision = decideLiveFailure(failures, error);
        failures = decision.consecutiveFailures;
        console.error('[PawSpeak] Live pet detector failed; retrying', error);
        setLiveTracks([]);
        motionSamplesRef.current.clear();
        setPositionChanged(false);
        setGuidance(buildLiveGuidance(null, brightness, video.videoWidth, video.videoHeight));
        if (decision.showUnavailable) {
          setDetectorDiagnostic(detectorErrorDetails(error));
          setTrackingStatus('unavailable');
        }
        // Always keep the loop alive so a transient GPU or frame error self-heals.
        timer = setTimeout(checkFrame, decision.retryDelay);
      }
    };
    void checkFrame();
    return () => { active = false; clearTimeout(timer); };
  }, [phase, trackingRetry]);
  const startCamera = async (nextFacing = facing) => {
    const request = ++requestRef.current;
    setPhase('starting'); setMessage(''); setAnalysis(null); setPreview(null); setDetectorDiagnostic('');
    lastCanvasRef.current = null;
    setTrackingStatus('checking');
    tracksRef.current = createPetTrackState(); motionSamplesRef.current.clear(); setPositionChanged(false); setLiveTracks([]);
    stopCamera();
    const cameraResult = await requestCameraStream(navigator.mediaDevices, window.isSecureContext, nextFacing);
    if (request !== requestRef.current) {
      if (cameraResult.status === 'granted') cameraResult.stream.getTracks().forEach(track => track.stop());
      return;
    }
    if (cameraResult.status === 'error') { setPhase('error'); setMessage(cameraResult.message); return; }
    try {
      const stream = cameraResult.stream;
      if (request !== requestRef.current) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (request !== requestRef.current) {
        stream.getTracks().forEach(track => track.stop());
        if (streamRef.current === stream) streamRef.current = null;
        return;
      }
      setPhase('live');
    } catch (error) {
      if (request !== requestRef.current) return;
      stopCamera();
      setPhase('error');
      setMessage(cameraStartErrorMessage(error));
    }
  };
  const analyzeCanvas = async (canvas: HTMLCanvasElement) => {
    const request = ++requestRef.current;
    setPhase('analyzing'); setMessage(''); setAnalysis(null); setDetectorDiagnostic(''); lastCanvasRef.current = canvas;
    try {
      const scene = await detectScene(canvas);
      const detections = scene.pets;
      if (request !== requestRef.current) return;
      let behavior: BehaviorResult | null = null;
      let pose: AnimalPoseAnalysis | null = null;
      let poseStatus: Analysis['poseStatus'] = detections.length === 1 ? 'unavailable' : 'unclear';
      const detectedAnimal = detections.length === 1 ? detections[0] : null;
      if (detectedAnimal?.pet === 'bird') poseStatus = 'unsupported';
      if (detectedAnimal && detectedAnimal.pet !== 'bird') {
        try {
          const estimator = await getAnimalPoseEstimator();
          pose = await estimator.estimate(canvas, detectedAnimal);
          poseStatus = pose.status;
        } catch (error) {
          console.warn('[PawSpeak] Animal pose model unavailable', error);
          poseStatus = 'unavailable';
        }
      }
      if (detectedAnimal && (detectedAnimal.pet === 'dog' || detectedAnimal.pet === 'cat')) {
        try {
          const classifier = await getBehaviorClassifier();
          const crop = cropDetection(canvas, detectedAnimal.bbox);
          if (classifier && crop) behavior = await classifier.classify(crop, detectedAnimal.pet);
        } catch (error) {
          console.warn('[PawSpeak] Cue classifier unavailable', error);
        }
      }
      if (request !== requestRef.current) return;
      setAnalysis({ detections, otherObjects: scene.otherObjects, behavior, pose, poseStatus }); setPhase('result');
    } catch (error) {
      if (request !== requestRef.current) return;
      console.error('[PawSpeak] Photo pet detector failed', error);
      setDetectorDiagnostic(detectorErrorDetails(error));
      setPhase('error');
      setMessage(petDetectorErrorMessage());
    }
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) { setMessage('Wait for the camera preview, then capture again.'); return; }
    const canvas = canvasRef.current ?? document.createElement('canvas');
    const scale = Math.min(1, 960 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) { setMessage('PawSpeak could not read the camera frame. Wait for the live preview, then try again.'); return; }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    stopCamera(); setPreview(canvas.toDataURL('image/jpeg', 0.88)); await analyzeCanvas(canvas);
  };
  const uploadPhoto = async (file?: File) => {
    if (!file) return;
    setPreview(null); setAnalysis(null); setMessage(''); lastCanvasRef.current = null;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setPhase('error'); setMessage('Choose a JPG, PNG, or WebP photo of your pet.'); return; }
    if (file.size > 12 * 1024 * 1024) { setPhase('error'); setMessage('Choose a photo smaller than 12 MB.'); return; }
    stopCamera();
    try {
      const image = new Image(); const url = URL.createObjectURL(file); image.src = url;
      try { await image.decode(); } finally { URL.revokeObjectURL(url); }
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 960 / image.naturalWidth);
      canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
      setPreview(canvas.toDataURL('image/jpeg', 0.88)); await analyzeCanvas(canvas);
    } catch { setPhase('error'); setMessage('This photo could not be read. Try another image.'); }
    finally { if (uploadRef.current) uploadRef.current.value = ''; }
  };
  const reset = () => { requestRef.current += 1; stopCamera(); tracksRef.current = createPetTrackState(); motionSamplesRef.current.clear(); setPositionChanged(false); setLiveTracks([]); setTrackingStatus('checking'); setDetectorDiagnostic(''); lastCanvasRef.current = null; setPhase('idle'); setPreview(null); setAnalysis(null); setMessage(''); };
  const detection = analysis?.detections[0];
  const petGuidance = guidance.find(check => check.id === 'pet');
  const liveMessage = petGuidance?.status === 'good'
          ? `I can see a ${liveTracks[0]?.pet ?? 'animal'}!`
      : petGuidance?.detail === 'One at a time'
        ? 'I see a few animals! Let’s look at one at a time.'
        : 'Let’s find an animal!';
  const projectedLiveTracks = liveTracks.flatMap(track => {
    const video = videoRef.current;
    if (!video) return [];
    const box = projectBoxToCover(track.bbox, video.videoWidth, video.videoHeight, video.clientWidth, video.clientHeight);
    return box ? [{ track, box }] : [];
  });
  const showCameraEmpty = !preview && (phase === 'idle' || phase === 'error');
  return <div>
    <PageHeading tone="sky" icon={<PawPrint />} title="Let’s get your pet in view" description="I’ll help with a clear photo. For body-language meanings, explore the dictionary." />
    <div className={showCameraEmpty ? 'camera-stage camera-stage-empty-state' : 'camera-stage'} style={preview ? { aspectRatio: `${lastCanvasRef.current?.width || 4}/${lastCanvasRef.current?.height || 3}`, height: 'auto' } : undefined}>
      {phase === 'live' || phase === 'starting' ? <>
        <video ref={videoRef} className="camera-video" autoPlay muted playsInline aria-label="Live pet camera preview" />
        {phase === 'live' && <div className="live-pet-tracks" aria-label="Animals in view">{projectedLiveTracks.map(({ track, box }) => <span key={track.id} className={`live-pet-box ${track.missedFrames ? 'live-pet-box-held' : ''}`} style={{ left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%` }} aria-label={`Animal ${track.id}: ${track.pet}, ${Math.round(track.confidence * 100)} percent model score`}><span className="live-pet-label">{animalName(track.pet)} · {Math.round(track.confidence * 100)}%</span></span>)}</div>}
        <div className="camera-frame" aria-hidden="true"><span /><span /><span /><span /></div>
        <span className="camera-live-label" role="status">{phase === 'starting' ? 'Opening camera…' : trackingStatus === 'unavailable' ? 'Camera on' : petGuidance?.status === 'good' ? 'Pet in view' : 'Finding your pet…'}</span>
        <button className="camera-close" onClick={reset} aria-label="Stop camera"><X /></button>
        <button className="camera-switch" onClick={() => { const next = facing === 'environment' ? 'user' : 'environment'; setFacing(next); void startCamera(next); }} aria-label="Switch camera"><SwitchCamera /></button>
      </> : preview ? <div className="capture-preview"><img src={preview} alt="Captured image for analysis" />
        {analysis?.pose?.points.length && lastCanvasRef.current && <svg className="animal-pose-overlay" viewBox={`0 0 ${lastCanvasRef.current.width} ${lastCanvasRef.current.height}`} preserveAspectRatio="none" role="img" aria-label="Estimated animal body landmarks">
          {POSE_BONES.map(([from, to]) => {
            const a = analysis.pose?.points[from]; const b = analysis.pose?.points[to];
            if (!a || !b || a.certainty < 0.005 || b.certainty < 0.005) return null;
            return <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
          })}
          {analysis.pose.points.filter(point => point.certainty >= 0.005).map(point => <circle key={point.name} cx={point.x} cy={point.y} r={Math.max(3, lastCanvasRef.current!.width / 180)} />)}
        </svg>}
        {analysis?.detections.map((animal, i) => <span key={i} className="detection-box" style={{ left: `${animal.bbox[0] / (lastCanvasRef.current?.width || 1) * 100}%`, top: `${animal.bbox[1] / (lastCanvasRef.current?.height || 1) * 100}%`, width: `${animal.bbox[2] / (lastCanvasRef.current?.width || 1) * 100}%`, height: `${animal.bbox[3] / (lastCanvasRef.current?.height || 1) * 100}%` }}><span className="live-pet-label">{animalName(animal.pet)} · {Math.round(animal.confidence * 100)}% model score</span></span>)}
        {phase === 'analyzing' && <div className="analyzing-cover"><LoaderCircle className="spin" /><strong>Checking your photo…</strong><span>Your photo stays on this device.</span></div>}
      </div> : <div className="camera-empty"><div className="camera-mascot-scene"><img className="camera-mascot mascot-avatar" src="/mascots/dog.webp" alt="" /></div><h2>A clear view helps</h2><p>Keep one animal in good light for a clearer detection.</p><small className="camera-profile-note">Scan without a pet profile. Dog and cat guides are in Learn.</small></div>}
      <canvas ref={canvasRef} hidden />
    </div>
    {phase === 'live' && <button className="capture-button" onClick={() => void capture()}><Camera /><span>Capture pet</span></button>}
    {phase === 'live' && (trackingStatus === 'unavailable'
      ? <div className="live-coach live-coach-error" role="alert">
        <div className="live-coach-error-heading"><AlertCircle aria-hidden="true" /><strong>Animal finding paused</strong></div>
        <p>{petDetectorErrorMessage()}</p>
        {detectorDiagnostic && <details className="detector-diagnostic"><summary>Technical details</summary><code>{detectorDiagnostic}</code></details>}
        <button className="live-retry-button" onClick={() => {
          setTrackingStatus('checking');
          setDetectorDiagnostic('');
          setGuidance(buildLiveGuidance(null, null, 0, 0));
          setLiveTracks([]);
          setTrackingRetry(retry => retry + 1);
        }}><RefreshCw aria-hidden="true" />Try again</button>
      </div>
      : <div className="live-coach" role="group" aria-label="Camera tips">
        <div className="live-coach-message"><PawPrint aria-hidden="true" /><strong>{liveMessage}</strong></div>
        <div className="live-coach-checks">{guidance.map(check => <div className={`coach-check coach-${check.status}`} key={check.id}>
          {check.status === 'good' ? <CheckCircle2 /> : check.status === 'warn' ? <AlertCircle /> : <CircleDashed />}
          <span><strong>{check.label}</strong><small>{check.detail}</small></span>
        </div>)}</div>
        {positionChanged && <p className="motion-observation" role="status">Your animal’s tracked position changed across camera checks. Camera movement can affect this observation.</p>}
      </div>)}
    {(phase === 'idle' || phase === 'error') && <div className="camera-actions"><button className="btn-primary btn-large" onClick={() => void startCamera()}><Camera />Start camera</button>
      <input ref={uploadRef} id="pet-photo" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void uploadPhoto(event.target.files?.[0])} />
      <label htmlFor="pet-photo" className="btn-secondary btn-large"><ImagePlus />Upload a photo</label></div>}
    {message && (phase === 'error' || phase === 'live') && <div className="inline-alert" role="alert"><p>{message}</p>{detectorDiagnostic && <details className="detector-diagnostic"><summary>Technical details</summary><code>{detectorDiagnostic}</code></details>}{phase === 'error' && lastCanvasRef.current && <button className="btn-text" onClick={() => { if (lastCanvasRef.current) void analyzeCanvas(lastCanvasRef.current); }}>Retry detection</button>}</div>}

    {phase === 'result' && analysis && <section className="analysis-result" aria-live="polite">
      {analysis.detections.length === 0 ? <><span className="result-symbol result-symbol-muted"><PawPrint /></span><h2>No animal found</h2>
        {analysis.otherObjects.length > 0 ? <p>I spotted <strong>{analysis.otherObjects.map(object => object.label).join(' or ')}</strong>. This camera model recognizes common animals including dogs, cats, birds, horses, and several farm and wild animals.</p>
          : <p>Try a closer, brighter photo with the animal clearly visible. This model recognizes common COCO animal classes; it may miss other species or unclear views.</p>}
        <p className="result-note">A missing detection does not prove that no animal is present.</p></>
        : analysis.detections.length > 1 ? <><span className="result-symbol result-symbol-amber"><PawPrint /></span><h2>More than one animal found</h2><p>I detected {analysis.detections.map(item => animalName(item.pet)).join(', ')}. Camera detection identifies common animal types, but it can’t read body language.</p></>
        : detection && <><div className="detected-pill detected-dog"><PawPrint /> {animalName(detection.pet)} detected</div>
          <h2>{analysis.poseStatus === 'ready' ? 'Visible body posture' : analysis.poseStatus === 'unsupported' ? 'Pose landmarks aren’t available for birds yet' : analysis.poseStatus === 'unavailable' ? 'Animal found; pose model unavailable' : 'Animal found; body pose is unclear'}</h2>
          <p>{analysis.poseStatus === 'ready' && analysis.pose?.signal === 'limbs-extended'
            ? 'The pose model estimates that the visible limbs extend below the torso. This is a shape cue, not a reading of emotion or intent.'
            : analysis.poseStatus === 'ready' && analysis.pose?.signal === 'limbs-tucked'
              ? 'The pose model estimates that the visible limbs are held close to the torso. A still image cannot tell whether this is a relaxed loaf, a tense crouch, or another posture.'
              : analysis.poseStatus === 'unsupported'
                ? 'Bird detection still works. This pose model is trained on the AP-10K quadruped skeleton, so PawSpeak does not apply it to birds.'
                : analysis.poseStatus === 'unavailable'
                  ? 'The animal detector worked, but the pose model could not load or run. Check storage/network on first use, then retry with another photo.'
                  : 'Try a clear, side-on, full-body photo. This pose model needs visible landmarks and will stay unclear when the angle or image quality is not enough.'}</p>
          {analysis.pose?.points.length ? <p className="pose-landmark-note">Overlay shows estimated AP-10K landmarks. It does not mark ears or the tail tip.</p> : null}
          {(detection.pet === 'dog' || detection.pet === 'cat')
            ? <>
              {analysis.behavior?.status === 'ready' && <ul className="behavior-candidates" aria-label={`Possible cues from model ${analysis.behavior.modelVersion}`}>
                {analysis.behavior.candidates.map(candidate => {
                  const cue = BODY_LANGUAGE.find(entry => entry.id === candidate.label);
                  if (!cue) return null;
                  return <li key={candidate.label}><strong>{cue.name}</strong><span>{cue.status} · {Math.round(candidate.score * 100)}% model score</span><small>{cue.evidenceSummary} Context: {cue.context}</small></li>;
                })}
              </ul>}
              <button className="btn-primary" onClick={() => onExplore(detection.pet as PetKind)}>Explore {detection.pet} body language</button></>
            : <p>This general animal pose estimate does not map to a validated body-language guide for this species yet.</p>}</>}
      <button className="btn-secondary" onClick={reset}><RefreshCw />Try another photo</button>
    </section>}
    <div className="privacy-note"><ShieldCheck /><p><strong>Your photos stay on this device.</strong> PawSpeak checks them here and doesn’t upload or save them. Camera checks can find a pet, but can’t tell how they feel.</p>{offlineStatus && offlineStatus !== 'development' && <span className={`offline-status offline-status-${offlineStatus}`}>{offlineStatus === 'ready' ? 'Ready to use offline' : offlineStatus === 'unavailable' ? 'Offline use isn’t ready' : 'Getting ready for offline use…'}</span>}</div>
    <SoundCueCheck />
  </div>;
}

