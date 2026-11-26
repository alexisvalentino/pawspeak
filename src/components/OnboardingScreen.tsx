import { BookOpen, Camera, ShieldCheck } from 'lucide-react';
import { MascotDuoScene } from './MascotDuoScene';

export function OnboardingScreen({
  platform,
  pending,
  error,
  onAllowCamera,
  onContinueWithoutCamera,
}: {
  platform: string;
  pending: boolean;
  error: string;
  onAllowCamera: () => void;
  onContinueWithoutCamera: () => void;
}) {
  const platformName = platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : 'your browser';

  return <main className="onboarding-shell">
    <div className="onboarding-brand">
      <img className="brand-mark" src="/pawspeak-mascot-logo.webp" alt="" />
      <span>PawSpeak</span>
    </div>
    <section className="onboarding-card" aria-labelledby="onboarding-title">
      <MascotDuoScene className="mascot-duo-onboarding" />
      <h1 id="onboarding-title">Pet pals, understood.</h1>
      <p className="onboarding-intro">Track behavior. Understand together. Share what you see.</p>

      <div className="onboarding-privacy">
        <ShieldCheck aria-hidden="true" />
        <p><strong>Your camera stays yours.</strong> Frames are analyzed on this device. PawSpeak doesn’t upload or save them, and it doesn’t infer feelings.</p>
      </div>

      <p className="onboarding-camera-note">Camera access is optional. {platformName} will ask only if you choose to turn it on.</p>

      {error && <p className="onboarding-error" role="alert">{error}</p>}
      <button className="btn-primary onboarding-primary" onClick={onAllowCamera} disabled={pending}>
        <Camera aria-hidden="true" />{pending ? 'Waiting for permission…' : error ? 'Try camera access again' : 'Allow camera & continue'}
      </button>
      <button className="btn-secondary onboarding-secondary" onClick={onContinueWithoutCamera}>Continue without camera</button>
      {pending && <p className="onboarding-pending" role="status">Approve or deny the camera request in the system prompt to continue.</p>}
      <p className="onboarding-footnote"><BookOpen aria-hidden="true" /> The dog and cat dictionary is always available.</p>
    </section>
  </main>;
}
