import { BookOpen, Camera, CheckCircle2, ShieldCheck } from 'lucide-react';

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
      <img src="/pawspeak-icon.svg" alt="" />
      <span>PawSpeak</span>
    </div>
    <section className="onboarding-card" aria-labelledby="onboarding-title">
      <span className="onboarding-icon"><Camera aria-hidden="true" /></span>
      <p className="onboarding-eyebrow">A quick camera setup</p>
      <h1 id="onboarding-title">Let’s meet your pet.</h1>
      <p className="onboarding-intro">Camera access lets PawSpeak show a live preview and find dogs or cats. When you continue, {platformName} will ask for camera permission.</p>

      <div className="onboarding-privacy">
        <ShieldCheck aria-hidden="true" />
        <p><strong>Your camera stays yours.</strong> Frames are analyzed on this device. PawSpeak doesn’t upload or save them, and it doesn’t infer feelings.</p>
      </div>

      <div className="onboarding-points">
        <div><CheckCircle2 aria-hidden="true" /><span>Use camera scanning without creating a pet profile.</span></div>
        <div><BookOpen aria-hidden="true" /><span>You can explore the dictionary without camera access.</span></div>
      </div>

      {error && <p className="onboarding-error" role="alert">{error}</p>}
      <button className="btn-primary onboarding-primary" onClick={onAllowCamera} disabled={pending}>
        <Camera aria-hidden="true" />{pending ? 'Waiting for permission…' : error ? 'Try camera access again' : 'Allow camera & continue'}
      </button>
      <button className="btn-secondary onboarding-secondary" onClick={onContinueWithoutCamera}>Continue without camera</button>
      {pending && <p className="onboarding-pending" role="status">Approve or deny the camera request in the system prompt to continue.</p>}
      <p className="onboarding-footnote">You can change camera access later in your device or browser settings.</p>
    </section>
  </main>;
}
