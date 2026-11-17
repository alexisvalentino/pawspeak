import { useEffect, useState } from 'react';
import { cuesForSpecies, Observation, PetProfile } from '../types/journal';
import { createId, suggestions, toLocalInput, validateObservation } from '../utils/journal';
import { MediaAttachment, MediaPreview } from './MediaAttachment';

export function ObservationForm({ pet, observation, onSave, onCancel }: {
  pet: PetProfile; observation?: Observation; onSave: (observation: Observation) => void; onCancel?: () => void;
}) {
  const [cues, setCues] = useState<Observation['cues']>([]);
  const [occurredAt, setOccurredAt] = useState(toLocalInput());
  const [activity, setActivity] = useState('');
  const [environment, setEnvironment] = useState('');
  const [nearby, setNearby] = useState('');
  const [recentEvent, setRecentEvent] = useState('');
  const [notes, setNotes] = useState('');
  const [media, setMedia] = useState<MediaPreview | null>(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setCues(observation?.cues ?? []);
    setOccurredAt(observation?.occurredAt ?? toLocalInput());
    setActivity(observation?.context.activity ?? '');
    setEnvironment(observation?.context.environment ?? '');
    setNearby(observation?.context.nearby ?? '');
    setRecentEvent(observation?.context.recentEvent ?? '');
    setNotes(observation?.context.notes ?? '');
    setError(''); setMedia(null);
    setConsent(observation?.mediaConsent ?? false);
  }, [observation, pet.id]);
  const context = { activity: activity.trim(), environment: environment.trim(), nearby: nearby.trim(), recentEvent: recentEvent.trim(), notes: notes.trim() };
  const suggestion = suggestions(cues, context, pet.species);
  const toggleCue = (cue: typeof cues[number]) => setCues(current => current.includes(cue) ? current.filter(c => c !== cue) : [...current, cue]);

  return <form onSubmit={event => {
    event.preventDefault();
    const next: Observation = { id: observation?.id ?? createId(), petId: pet.id,
      createdAt: observation?.createdAt ?? new Date().toISOString(), occurredAt, cues, context,
      interpretation: suggestion, mediaConsent: consent, hasMedia: !!media };
    const validation = validateObservation(next, new Date(), pet.species);
    if (validation) { setError(validation); requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' })); return; }
    onSave(next); setError('');
    if (media) URL.revokeObjectURL(media.url);
    if (!observation) { setCues([]); setActivity(''); setEnvironment(''); setNearby(''); setRecentEvent(''); setNotes(''); setMedia(null); setConsent(false); setOccurredAt(toLocalInput()); }
    onCancel?.();
  }} className="space-y-1" noValidate>
    <div className="mb-5"><h1 className="heading-lg">{observation ? 'Edit observation' : `What did you notice about ${pet.name}?`}</h1>
      <p className="body-secondary mt-2">Record what you saw and heard before deciding what it might mean.</p></div>
    {error && <div className="error-text mb-4" role="alert" tabIndex={-1}><h2 className="font-bold">This observation needs more detail</h2><p className="mt-1">{error}</p></div>}
    <section className="section-block">
      <h2 className="heading-md">Observed cues</h2>
      <p className="body-secondary mt-1 mb-3">Choose everything you clearly noticed. Don't guess at cues you didn't see.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {cuesForSpecies(pet.species).map(cue => <label key={cue} aria-label={`Observed: ${cue}`} className={`cue-option ${cues.includes(cue) ? 'cue-selected' : ''}`}>
          <input type="checkbox" checked={cues.includes(cue)} onChange={() => toggleCue(cue)} className="w-5 h-5 shrink-0" />
          <span>{cue}</span>
        </label>)}
      </div>
    </section>
    <section className="section-block">
      <h2 className="heading-md">Context</h2>
      <p className="body-secondary mt-1 mb-4">The same cue can mean different things in different situations.</p>
      <div className="grid gap-4 sm:grid-cols-2" aria-invalid={!activity.trim() || !environment.trim()}>
        <div><label className="field-label" htmlFor="observation-activity">Activity</label>
          <input id="observation-activity" className="field" required maxLength={120} value={activity} onChange={e => setActivity(e.target.value)} placeholder="Playing, resting, greeting…" /></div>
        <div><label className="field-label" htmlFor="observation-environment">Setting</label>
          <input id="observation-environment" className="field" required maxLength={120} value={environment} onChange={e => setEnvironment(e.target.value)} placeholder="Living room, garden, park…" /></div>
        <div><label className="field-label" htmlFor="observation-nearby">Who or what was nearby? (optional)</label>
          <input id="observation-nearby" className="field" maxLength={200} value={nearby} onChange={e => setNearby(e.target.value)} placeholder="People, other pets, sounds…" /></div>
        <div><label className="field-label" htmlFor="observation-event">What happened just before? (optional)</label>
          <input id="observation-event" className="field" maxLength={200} value={recentEvent} onChange={e => setRecentEvent(e.target.value)} placeholder="Doorbell, visitor, toy offered…" /></div>
        <div className="sm:col-span-2"><label className="field-label" htmlFor="observation-time">When did this happen?</label>
          <input id="observation-time" type="datetime-local" className="field" required value={occurredAt} max={toLocalInput()} onChange={e => setOccurredAt(e.target.value)} /></div>
        <div className="sm:col-span-2"><label className="field-label" htmlFor="observation-notes">What happened, in order?</label>
          <textarea id="observation-notes" className="field" required maxLength={2000} rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder={`Describe what you saw and heard before, during, and after. Avoid guessing how your ${pet.species} was feeling.`} />
          <p className="body-secondary mt-1">{notes.length}/2000 characters</p></div>
      </div>
    </section>
    <MediaAttachment media={media} onChange={setMedia} consent={consent} onConsent={setConsent} />
    <section className="section-block" aria-live="polite">
      <h2 className="heading-md">A possible reading</h2>
      {cues.length === 0 ? <p className="body-secondary mt-2">Choose observable cues to see whether a prototype pattern applies.</p>
          : suggestion ? <><p className="mt-2 text-sm leading-6">{suggestion}</p><p className="body-secondary mt-2">Prototype cue-based guidance, not AI analysis or expert validation. Compare it with the whole situation and your knowledge of {pet.name}.</p></>
          : <p className="body-secondary mt-2">There isn't enough context for a useful suggestion. Save the observation and look for patterns over time instead.</p>}
    </section>
    <div className="sticky-form-actions">
      <button className="button-primary w-full" type="submit">{observation ? 'Save changes' : 'Save observation'}</button>
      {onCancel && <button type="button" className="button-secondary w-full" onClick={onCancel}>Cancel editing</button>}
    </div>
  </form>;
}
