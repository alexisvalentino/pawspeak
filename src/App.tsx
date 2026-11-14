import { useEffect, useReducer, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { BookOpen } from 'lucide-react';
import { AppHeader } from './components/AppHeader';
import { AppNavigation } from './components/AppNavigation';
import { CameraScreen } from './components/CameraScreen';
import { DictionaryScreen } from './components/DictionaryScreen';
import { DogForm } from './components/DogForm';
import { ObservationForm } from './components/ObservationForm';
import { JournalList } from './components/JournalList';
import { ProfilesScreen } from './components/ProfilesScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { PageHeading } from './components/PageHeading';
import { Observation } from './types/journal';
import { reducer, migrateState, STORAGE_KEY, LEGACY_KEY, INITIALIZED_KEY, downloadJournal } from './utils/journal';
import type { PetKind } from './ml/petClassifier';
import { requestCameraStream } from './ml/cameraPermission';
import { removeDevelopmentOfflineCache } from './utils/serviceWorkerCleanup';

type Screen = 'camera' | 'dictionary' | 'observe' | 'journal' | 'profiles';
const CAMERA_ONBOARDING_KEY = 'pawspeak:camera-onboarding:v1';
export default function App() {
  const [state, dispatch] = useReducer(reducer, null, () => {
    try { return migrateState(localStorage.getItem(STORAGE_KEY), localStorage.getItem(LEGACY_KEY), localStorage.getItem(INITIALIZED_KEY) === 'true'); }
    catch { return migrateState(null); }
  });
  const [screen, setScreen] = useState<Screen>('camera');
  const [species, setSpecies] = useState<PetKind>('dog');
  const [dogForm, setDogForm] = useState<{ id?: string; open: boolean }>({ open: false });
  const [editing, setEditing] = useState<Observation | undefined>();
  const [storageError, setStorageError] = useState(false);
  const [toast, setToast] = useState('');
  const [offlineStatus, setOfflineStatus] = useState<'ready' | 'preparing' | 'unavailable' | 'development'>('preparing');
  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    try { return localStorage.getItem(CAMERA_ONBOARDING_KEY) === 'complete'; }
    catch { return false; }
  });
  const [cameraPermissionPending, setCameraPermissionPending] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState('');
  const cameraPermissionRequestRef = useRef(0);
  const initialCameraStreamRef = useRef<MediaStream | null>(null);
  const [initialCameraStreamToken, setInitialCameraStreamToken] = useState(0);
  const dog = state.dogs.find(d => d.id === state.activeDogId);
  const observations = state.observations.filter(o => o.petId === dog?.id);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); localStorage.setItem(INITIALIZED_KEY, 'true'); setStorageError(false); } catch { setStorageError(true); } }, [state]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [screen]);
  useEffect(() => {
    // Capacitor ships the complete app and model inside the APK, so browser-side
    // cache copies are only needed for the installable web app.
    if (Capacitor.isNativePlatform()) { setOfflineStatus('ready'); return; }
    if (!import.meta.env.PROD) {
      setOfflineStatus('development');
      // A production service worker left on this origin would keep serving its cached
      // build, hiding every source change made while running `npm run dev`.
      void removeDevelopmentOfflineCache(navigator.serviceWorker, globalThis.caches)
        .then(({ reloadRequired }) => { if (reloadRequired) window.location.reload(); })
        .catch(error => console.warn('[PawSpeak] Could not remove the development service worker', error));
      return;
    }
    if (!('serviceWorker' in navigator)) { setOfflineStatus('unavailable'); return; }
    let active = true;
    const onControllerChange = () => window.location.reload();
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    setOfflineStatus('preparing');
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        if (navigator.storage?.persist) void navigator.storage.persist().catch(() => false);
        if (active) setOfflineStatus('ready');
      })
      .catch(() => { if (active) setOfflineStatus('unavailable'); });
    return () => {
      active = false;
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);
  const notify = (message: string) => setToast(message);
  const completeOnboarding = (cancelPendingPermission = false) => {
    if (cancelPendingPermission) {
      cameraPermissionRequestRef.current += 1;
      setCameraPermissionPending(false);
    }
    try { localStorage.setItem(CAMERA_ONBOARDING_KEY, 'complete'); } catch { /* The app can still run without remembering onboarding. */ }
    setOnboardingComplete(true);
  };
  const allowCameraFromOnboarding = async () => {
    if (cameraPermissionPending) return;
    const requestId = ++cameraPermissionRequestRef.current;
    setCameraPermissionPending(true);
    setCameraPermissionError('');
    const result = await requestCameraStream(navigator.mediaDevices, window.isSecureContext);
    if (requestId !== cameraPermissionRequestRef.current) {
      if (result.status === 'granted') result.stream.getTracks().forEach(track => track.stop());
      return;
    }
    if (result.status === 'granted') {
      initialCameraStreamRef.current = result.stream;
      setInitialCameraStreamToken(token => token + 1);
      completeOnboarding();
    } else {
      setCameraPermissionError(result.message);
    }
    setCameraPermissionPending(false);
  };
  if (!onboardingComplete) {
    return <OnboardingScreen
      platform={Capacitor.getPlatform()}
      pending={cameraPermissionPending}
      error={cameraPermissionError}
      onAllowCamera={() => void allowCameraFromOnboarding()}
      onContinueWithoutCamera={() => completeOnboarding(true)}
    />;
  }
  return <div className="app-shell">
    <AppHeader dogs={state.dogs} activeDog={dog} onHome={() => setScreen('camera')} onSelect={id => { if (id) dispatch({ type: 'select', id }); setScreen('journal'); setEditing(undefined); }} onAdd={() => setDogForm({ open: true })} onExport={() => { downloadJournal(state); notify('Text journal export requested. Media is not included.'); }} onClear={() => { dispatch({ type: 'clear' }); setEditing(undefined); notify('Local profiles and observations deleted.'); }} />
    <main id="main-content" className="app-content">
      {storageError && <p className="error-text" role="alert">This browser could not save your changes. Keep this tab open and export a copy if possible.</p>}
      {screen === 'camera' && <CameraScreen
        offlineStatus={offlineStatus}
        initialCameraStreamRef={initialCameraStreamRef}
        initialCameraStreamToken={initialCameraStreamToken}
        onExplore={kind => { setSpecies(kind); setScreen('dictionary'); }}
      />}
      {screen === 'dictionary' && <DictionaryScreen species={species} onSpeciesChange={setSpecies} />}
      {screen === 'observe' && dog && (editing ? <ObservationForm key={editing.id} dog={dog} observation={editing} onSave={entry => { dispatch({ type: 'saveObservation', observation: entry }); setEditing(undefined); setScreen('journal'); notify('Observation updated.'); }} onCancel={() => { setEditing(undefined); setScreen('journal'); }} />
        : <ObservationForm key={dog.id} dog={dog} onSave={entry => { dispatch({ type: 'saveObservation', observation: entry }); setScreen('journal'); notify('Observation saved.'); }} />)}
      {screen === 'journal' && (dog ? <><PageHeading tone="mint" icon={<BookOpen />} title={`${dog.name}'s journal`} description="Notice patterns over time." action={<button className="button-primary" onClick={() => { setEditing(undefined); setScreen('observe'); }}>New observation</button>} /><JournalList observations={observations} onEdit={entry => { setEditing(entry); setScreen('observe'); }} onDelete={id => { dispatch({ type: 'deleteObservation', id }); notify('Observation deleted.'); }} /></>
        : <><PageHeading tone="mint" icon={<BookOpen />} title="Your journal" description="A little record of the moments you notice." action={<button className="button-primary" onClick={() => setDogForm({ open: true })}>Add dog</button>} /><div className="empty-state journal-empty"><h2>Your pet’s story starts here</h2><p>Add a dog profile to keep observations and context together.</p></div></>)}
      {screen === 'profiles' && <ProfilesScreen dogs={state.dogs} observations={state.observations} onAdd={() => setDogForm({ open: true })} onEdit={dog => setDogForm({ id: dog.id, open: true })} onDelete={id => { dispatch({ type: 'deleteDog', id }); notify('Dog and observations deleted.'); }} />}
    </main>
    <AppNavigation screen={screen} onNavigate={next => { setScreen(next); if (next !== 'observe') setEditing(undefined); }} />
    {dogForm.open && <DogForm key={dogForm.id ?? 'new'} dog={state.dogs.find(d => d.id === dogForm.id)} onClose={() => setDogForm({ open: false })} onSave={pet => { dispatch({ type: 'saveDog', dog: pet }); if (!dogForm.id) dispatch({ type: 'select', id: pet.id }); setDogForm({ open: false }); setScreen(dogForm.id ? 'profiles' : 'journal'); notify(dogForm.id ? 'Profile updated.' : `${pet.name}'s journal is ready.`); }} />}
    {toast && <div role="status" className="app-toast">{toast}</div>}
  </div>;
}
