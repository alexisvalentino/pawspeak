import { useEffect, useState } from 'react';
import { cuesForSpecies, Observation, PetProfile } from '../types/journal';
import { createId, suggestions, toLocalInput, validateObservation } from '../utils/journal';
import { MediaAttachment, MediaPreview } from './MediaAttachment';
import { ChevronDown, PawPrint, Plus, Search, X } from 'lucide-react';
import { Modal } from './modals/Modal';

export function ObservationForm({ pet, observation, onSave, onCancel, onDirtyChange }: {
  pet: PetProfile; observation?: Observation; onSave: (observation: Observation) => void; onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
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
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [cuePickerOpen, setCuePickerOpen] = useState(false);
  const [cueQuery, setCueQuery] = useState('');
  useEffect(() => {
    setCues(observation?.cues ?? []);
    setOccurredAt(observation?.occurredAt ?? toLocalInput());
    setActivity(observation?.context.activity ?? '');
    setEnvironment(observation?.context.environment ?? '');
    setNearby(observation?.context.nearby ?? '');
    setRecentEvent(observation?.context.recentEvent ?? '');
    setNotes(observation?.context.notes ?? '');
    setHasAttemptedSave(false); setHasChanges(false); setMedia(null); setCuePickerOpen(false); setCueQuery('');
    setConsent(observation?.mediaConsent ?? false);
  }, [observation, pet.id]);
  useEffect(() => { onDirtyChange?.(hasChanges); }, [hasChanges, onDirtyChange]);
  const context = { activity: activity.trim(), environment: environment.trim(), nearby: nearby.trim(), recentEvent: recentEvent.trim(), notes: notes.trim() };
  const suggestion = suggestions(cues, context, pet.species);
  const nextObservation: Observation = { id: observation?.id ?? 'draft', petId: pet.id,
    createdAt: observation?.createdAt ?? new Date().toISOString(), occurredAt, cues, context,
    interpretation: suggestion, mediaConsent: consent, hasMedia: !!media };
  const validationError = hasAttemptedSave
    ? !activity.trim() && !environment.trim() ? 'Add the activity and setting to give this observation context.'
    : !activity.trim() ? 'Add an activity to give this observation context.'
    : !environment.trim() ? 'Add a setting to give this observation context.'
    : validateObservation(nextObservation, new Date(), pet.species)
    : null;
  const toggleCue = (cue: typeof cues[number]) => {
    setCues(current => current.includes(cue) ? current.filter(c => c !== cue) : [...current, cue]);
    setHasChanges(true);
  };
  const filteredCues = cuesForSpecies(pet.species).filter(cue => cue.toLowerCase().includes(cueQuery.trim().toLowerCase()));

  return <form onSubmit={event => {
    event.preventDefault();
    const next = { ...nextObservation, id: observation?.id ?? createId() };
    setHasAttemptedSave(true);
    const validation = validateObservation(next, new Date(), pet.species);
    if (validation) {
      requestAnimationFrame(() => {
        const target = validation.includes('activity and setting')
          ? document.getElementById(!activity.trim() ? 'observation-activity' : 'observation-environment')
          : validation.includes('Describe what happened') ? document.getElementById('observation-notes')
          : validation.includes('date and time') || validation.includes('future') ? document.getElementById('observation-time')
          : validation.includes('cue') ? document.getElementById('add-observation-cue')
          : document.getElementById('observation-activity');
        target?.focus({ preventScroll: true });
        target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
      return;
    }
    onSave(next);
    if (media) URL.revokeObjectURL(media.url);
    onDirtyChange?.(false);
  }} className="observe-form" noValidate>
    <header className="screen-heading observe-heading">
      <div><h1>{observation ? 'Edit observation' : `What did you notice about ${pet.name}?`}</h1><p>Record what you saw before deciding what it might mean.</p></div>
      <PawPrint aria-hidden="true" />
    </header>
    {validationError && <div className="error-text mb-4" role="alert"><h2 className="font-bold">This observation needs more detail</h2><p className="mt-1">{validationError}</p></div>}
    <section className="observe-card" aria-invalid={hasAttemptedSave && cues.length === 0}>
      <h2 className="heading-md">Observed cues <span className="field-required">Required</span></h2>
      <p className="body-secondary mt-1">Choose at least one cue you clearly saw.</p>
      {cues.length ? <ul className="observed-cue-chips">{cues.map(cue => <li key={cue}><span><PawPrint aria-hidden="true" />{cue}</span><button type="button" aria-label={`Remove ${cue}`} onClick={() => toggleCue(cue)}><X aria-hidden="true" /></button></li>)}</ul>
        : <p className="cue-selection-empty">No cues selected yet.</p>}
      <button id="add-observation-cue" type="button" aria-invalid={hasAttemptedSave && cues.length === 0} className="add-cue-button" onClick={() => setCuePickerOpen(true)}><Plus aria-hidden="true" />Add cue</button>
    </section>
    <section className="observe-card">
      <h2 className="heading-md">Context</h2>
      <p className="body-secondary mt-1 mb-4">The same cue can mean different things in different situations.</p>
      <div className="observe-context-grid" aria-invalid={!activity.trim() || !environment.trim()}>
        <div><label className="field-label" htmlFor="observation-activity">Activity <span className="field-required">Required</span></label><div className="observe-picker"><input id="observation-activity" aria-invalid={hasAttemptedSave && !activity.trim()} className="field" list="observation-activity-options" required maxLength={120} value={activity} onChange={e => { setActivity(e.target.value); setHasChanges(true); }} placeholder="Choose or type an activity" /><ChevronDown aria-hidden="true" /></div><datalist id="observation-activity-options"><option value="Playing" /><option value="Resting" /><option value="Eating" /><option value="Walking" /><option value="Greeting" /><option value="Training" /></datalist></div>
        <div><label className="field-label" htmlFor="observation-environment">Setting <span className="field-required">Required</span></label><div className="observe-picker"><input id="observation-environment" aria-invalid={hasAttemptedSave && !environment.trim()} className="field" list="observation-setting-options" required maxLength={120} value={environment} onChange={e => { setEnvironment(e.target.value); setHasChanges(true); }} placeholder="Choose or type a setting" /><ChevronDown aria-hidden="true" /></div><datalist id="observation-setting-options"><option value="Home" /><option value="Backyard" /><option value="Park" /><option value="On a walk" /><option value="Vet clinic" /><option value="Around visitors" /></datalist></div>
        <div className="observe-notes-field"><label className="field-label" htmlFor="observation-notes">What happened? <span className="field-required">Required</span></label><textarea id="observation-notes" aria-invalid={hasAttemptedSave && !notes.trim()} className="field" required maxLength={2000} rows={3} value={notes} onChange={e => { setNotes(e.target.value); setHasChanges(true); }} placeholder="Describe what you saw before, during, and after." /><p className="body-secondary mt-1">{notes.length}/2000 characters</p></div>
        <div className="observe-time-field"><label className="field-label" htmlFor="observation-time">When did this happen? <span className="field-required">Required</span></label><input id="observation-time" aria-invalid={hasAttemptedSave && (!occurredAt || Date.parse(occurredAt) > Date.now() + 5 * 60 * 1000)} type="datetime-local" className="field" required value={occurredAt} max={toLocalInput()} onChange={e => { setOccurredAt(e.target.value); setHasChanges(true); }} /></div>
        <details className="observe-more-context"><summary>More context <ChevronDown aria-hidden="true" /></summary>
          <div className="observe-context-grid observe-context-optional"><div><label className="field-label" htmlFor="observation-nearby">Who or what was nearby? (optional)</label><input id="observation-nearby" className="field" maxLength={200} value={nearby} onChange={e => { setNearby(e.target.value); setHasChanges(true); }} placeholder="People, pets, sounds…" /></div>
            <div><label className="field-label" htmlFor="observation-event">What happened just before? (optional)</label><input id="observation-event" className="field" maxLength={200} value={recentEvent} onChange={e => { setRecentEvent(e.target.value); setHasChanges(true); }} placeholder="Doorbell, visitor, toy…" /></div>
          </div>
        </details>
      </div>
    </section>
    <MediaAttachment media={media} onChange={value => { setMedia(value); setHasChanges(true); }} consent={consent} onConsent={value => { setConsent(value); setHasChanges(true); }} />
    <details className="possible-reading" aria-live="polite"><summary>Possible reading <span>Prototype guidance</span><ChevronDown aria-hidden="true" /></summary>
      {cues.length === 0 ? <p>Choose observable cues to see whether a prototype pattern applies.</p>
        : suggestion ? <><p>{suggestion}</p><small>Prototype cue-based guidance, not AI analysis or expert validation. Compare it with the whole situation and what you know about {pet.name}.</small></>
          : <p>There isn’t enough context for a useful suggestion. Save the observation and look for patterns over time instead.</p>}
    </details>
    <div className="sticky-form-actions">
      <button className="button-primary w-full" type="submit">{observation ? 'Save changes' : 'Save observation'}</button>
      {onCancel && <button type="button" className="button-secondary w-full" onClick={onCancel}>Cancel editing</button>}
    </div>
    {cuePickerOpen && <Modal label={`Choose ${pet.species} body-language cues`} onClose={() => setCuePickerOpen(false)}><div className="modal-panel cue-picker-panel">
      <header className="cue-picker-heading"><div><h2>Choose observed cues</h2><p>Only select what you clearly saw.</p></div><button type="button" className="icon-button" aria-label="Close cue picker" onClick={() => setCuePickerOpen(false)}><X aria-hidden="true" /></button></header>
      <label className="search-field cue-picker-search"><Search aria-hidden="true" /><span className="sr-only">Search cues</span><input type="search" value={cueQuery} onChange={event => setCueQuery(event.target.value)} placeholder={`Search ${pet.species} cues…`} /></label>
      <div className="cue-picker-options">{filteredCues.map(cue => <label key={cue} className={`cue-picker-option${cues.includes(cue) ? ' is-selected' : ''}`}><input type="checkbox" checked={cues.includes(cue)} onChange={() => toggleCue(cue)} /><span>{cue}</span></label>)}</div>
      {!filteredCues.length && <p className="cue-picker-empty">No cues match. Try another word.</p>}
      <button type="button" className="button-primary cue-picker-done" onClick={() => setCuePickerOpen(false)}>Done{cues.length ? ` · ${cues.length} selected` : ''}</button>
    </div></Modal>}
  </form>;
}
