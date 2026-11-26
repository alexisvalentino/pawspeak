import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { AppNavigation } from './components/AppNavigation';
import { CameraScreen } from './components/CameraScreen';
import { DictionaryScreen } from './components/DictionaryScreen';
import { PetForm } from './components/PetForm';
import { ObservationForm } from './components/ObservationForm';
import { JournalList } from './components/JournalList';
import { ProfilesScreen } from './components/ProfilesScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { AppInfoSheet } from './components/AppInfoSheet';
import { Modal } from './components/modals/Modal';
import { PetEmptyState } from './components/PetEmptyState';
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
  const [petForm, setPetForm] = useState<{ id?: string; open: boolean }>({ open: false });
  const [editing, setEditing] = useState<Observation | undefined>();
  const [observationDirty, setObservationDirty] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<Screen | null>(null);
  const [appInfoOpen, setAppInfoOpen] = useState(false);
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
  const navigateTo = useCallback((next: Screen) => {
    setPendingNavigation(null);
    if (next !== 'observe') {
      setEditing(undefined);
      setObservationDirty(false);
    }
    setScreen(next);
  }, []);
  const requestNavigation = useCallback((next: Screen) => {
    if (next === screen) return;
    if (screen === 'observe' && observationDirty) { setPendingNavigation(next); return; }
    navigateTo(next);
  }, [navigateTo, observationDirty, screen]);
  const pet = state.dogs.find(d => d.id === state.activeDogId);
  const observations = state.observations.filter(o => o.petId === pet?.id);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); localStorage.setItem(INITIALIZED_KEY, 'true'); setStorageError(false); } catch { setStorageError(true); } }, [state]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [screen]);
  useEffect(() => {
    // Android hardware back: return to the camera (home) screen before leaving.
    // Without this the back button closes the app from any screen.
    if (Capacitor.getPlatform() !== 'android') return;
    let disposed = false;
    let removeListener: (() => Promise<void>) | undefined;
    void CapacitorApp.addListener('backButton', () => {
      const openDialog = document.querySelector<HTMLDialogElement>('dialog[open]');
      if (openDialog) { openDialog.dispatchEvent(new Event('cancel', { cancelable: true })); return; }
      if (screen !== 'camera') {
        requestNavigation('camera');
        return;
      }
      void CapacitorApp.exitApp();
    }).then(handle => {
      if (disposed) void handle.remove();
      else removeListener = () => handle.remove();
    });
    return () => {
      disposed = true;
      if (removeListener) void removeListener();
    };
  }, [requestNavigation, screen]);
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
  const exportJournalFile = () => {
    downloadJournal(state);
    notify('Journal export downloaded. Profiles and notes are included; media is not.');
  };
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
    <a className="skip-link" href="#main-content">Skip to content</a>
    <main id="main-content" className="app-content" tabIndex={-1}>
      {storageError && <p className="error-text" role="alert">PawSpeak could not save your changes on this device. Keep the app open and export a copy if possible.</p>}
      {screen === 'camera' && <CameraScreen
        onHelp={() => { window.dispatchEvent(new Event('pawspeak:suspend-camera')); setAppInfoOpen(true); }}
        onObserve={pet ? () => setScreen('observe') : undefined}
        petName={pet?.name}
        petSpecies={pet?.species}
        offlineStatus={offlineStatus}
        initialCameraStreamRef={initialCameraStreamRef}
        initialCameraStreamToken={initialCameraStreamToken}
        onExplore={kind => { setSpecies(kind); setScreen('dictionary'); }}
      />}
      {screen === 'dictionary' && <DictionaryScreen species={species} onSpeciesChange={setSpecies} />}
      {screen === 'observe' && pet && (editing ? <ObservationForm key={editing.id} pet={pet} observation={editing} onDirtyChange={setObservationDirty} onSave={entry => { dispatch({ type: 'saveObservation', observation: entry }); navigateTo('journal'); notify('Observation updated.'); }} onCancel={() => requestNavigation('journal')} />
        : <ObservationForm key={pet.id} pet={pet} onDirtyChange={setObservationDirty} onSave={entry => { dispatch({ type: 'saveObservation', observation: entry }); navigateTo('journal'); notify('Observation saved.'); }} />)}
      {screen === 'journal' && (pet ? <JournalList pet={pet} observations={observations} onEdit={entry => { setEditing(entry); setScreen('observe'); }} onDelete={id => { dispatch({ type: 'deleteObservation', id }); notify('Observation deleted.'); }} onExport={exportJournalFile} />
        : <section className="journal-screen"><div className="screen-heading"><div><h1>Your journal</h1><p>A little record of the moments you notice.</p></div></div><PetEmptyState title="Your pet’s story starts here" description="Add a dog or cat in Pets to begin keeping a journal." /></section>)}
      {screen === 'profiles' && <ProfilesScreen pets={state.dogs} observations={state.observations} activePetId={state.activeDogId ?? undefined} onAdd={() => setPetForm({ open: true })} onSelect={id => { dispatch({ type: 'select', id }); const selectedPet = state.dogs.find(item => item.id === id); if (selectedPet) notify(`${selectedPet.name} is selected as your primary pet.`); }} onEdit={pet => setPetForm({ id: pet.id, open: true })} onDelete={id => { dispatch({ type: 'deletePet', id }); notify('Pet and observations deleted.'); }} />}
    </main>
    <AppNavigation screen={screen} onNavigate={requestNavigation} />
    <AppInfoSheet open={appInfoOpen} onClose={() => setAppInfoOpen(false)} onExport={exportJournalFile} onClear={() => { dispatch({ type: 'clear' }); setEditing(undefined); notify('Local profiles and observations deleted.'); }} />
    {pendingNavigation && <Modal label="Leave this observation?" onClose={() => setPendingNavigation(null)}>
      <div className="modal-panel surface p-5 w-full max-w-md relative discard-observation-dialog">
        <h2 className="heading-md">Leave without saving?</h2>
        <p className="body-secondary mt-2">Your observation is only on this screen. If you leave, your changes will be discarded.</p>
        <div className="discard-observation-actions"><button className="button-secondary" onClick={() => setPendingNavigation(null)}>Keep editing</button><button className="button-danger" onClick={() => navigateTo(pendingNavigation)}>Discard and leave</button></div>
      </div>
    </Modal>}
    {petForm.open && <PetForm key={petForm.id ?? 'new'} pet={state.dogs.find(d => d.id === petForm.id)} onClose={() => setPetForm({ open: false })} onSave={pet => { dispatch({ type: 'savePet', pet }); if (!petForm.id) dispatch({ type: 'select', id: pet.id }); setPetForm({ open: false }); setScreen('profiles'); notify(petForm.id ? 'Profile updated.' : `${pet.name}'s profile is ready.`); }} />}
    {toast && <div role="status" className="app-toast">{toast}</div>}
  </div>;
}
