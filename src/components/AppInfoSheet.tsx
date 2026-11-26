import { useState } from 'react';
import { Download, ShieldCheck, Trash2, X } from 'lucide-react';
import { Modal } from './modals/Modal';

export function AppInfoSheet({ open, onClose, onExport, onClear }: {
  open: boolean;
  onClose: () => void;
  onExport: () => void;
  onClear: () => void;
}) {
  const [confirmClear, setConfirmClear] = useState(false);
  if (!open) return null;

  return <Modal label="About PawSpeak" onClose={() => { setConfirmClear(false); onClose(); }}>
    <div className="modal-panel app-info-sheet">
      <button className="icon-button app-info-close" aria-label="Close about PawSpeak" onClick={() => { setConfirmClear(false); onClose(); }}><X /></button>
      <div className="app-info-brand"><img src="/pawspeak-mascot-logo.webp" alt="" /><span>PawSpeak</span></div>
      <h2 className="heading-md">About PawSpeak</h2>
      <p className="app-info-intro">Developed under Pawsmatch AI, PawSpeak is an early research milestone helping pet owners notice dog and cat body language and keep useful context together.</p>
      <p className="body-secondary app-version">Version <strong>{__APP_VERSION__}</strong></p>

      <section className="app-info-section">
        <h3><ShieldCheck aria-hidden="true" />Your data stays here</h3>
        <p>Profiles and notes are saved locally by PawSpeak on this device. Camera frames and attached media are processed or previewed here; they aren’t uploaded or saved with an observation.</p>
        <button className="journal-export-button" onClick={() => { onExport(); setConfirmClear(false); onClose(); }}><Download aria-hidden="true" />Export journal (JSON)</button>
      </section>

      <section className="app-info-section">
        <h3>Current limits</h3>
        <p>Camera checks can identify some animals and surface visible posture cues. PawSpeak’s source-backed dog and cat guides add context, but can’t tell exactly how your pet feels, translate vocalizations, or diagnose health issues. Contact a veterinarian about sudden changes, injury, or health concerns.</p>
      </section>

      <section className="app-info-section app-info-danger">
        <h3>Clear local data</h3>
        <p>Delete all pet profiles and observations saved by PawSpeak on this device.</p>
        {confirmClear ? <div className="app-clear-confirm" role="alert">
          <strong>This permanently deletes all profiles and observations.</strong>
          <div><button className="button-danger" onClick={() => { onClear(); setConfirmClear(false); onClose(); }}>Delete local data</button><button className="button-secondary" onClick={() => setConfirmClear(false)}>Cancel</button></div>
        </div> : <button className="button-danger-secondary" onClick={() => setConfirmClear(true)}><Trash2 aria-hidden="true" />Clear local data</button>}
      </section>
    </div>
  </Modal>;
}
