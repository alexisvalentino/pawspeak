import { useState } from 'react';
import { Observation } from '../types/journal';
import { Modal } from './modals/Modal';
import { formatObservationTime } from '../utils/journal';

export function JournalList({ observations, onEdit, onDelete }: {
  observations: Observation[]; onEdit: (observation: Observation) => void; onDelete: (id: string) => void;
}) {
  const [selected, setSelected] = useState<Observation | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = observations.filter(o => `${o.cues.join(' ')} ${o.context.activity} ${o.context.environment} ${o.context.notes}`.toLowerCase().includes(query.toLowerCase())).sort((a,b) => b.occurredAt.localeCompare(a.occurredAt));
  return <section className="section-block">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="heading-md">Saved observations</h2><p className="body-secondary mt-1">{observations.length} {observations.length === 1 ? 'entry' : 'entries'} · newest first</p></div>
      {observations.length > 3 && <div><label className="sr-only" htmlFor="journal-search">Search observations</label><input id="journal-search" className="field" type="search" placeholder="Search notes, cues or setting" value={query} onChange={e => setQuery(e.target.value)} /></div>}</div>
    <div className="mt-4">
      {filtered.length === 0 ? <div className="empty-state"><h3 className="font-bold">{observations.length ? 'No matching entries' : 'Your journal starts here'}</h3><p className="body-secondary mt-1">{observations.length ? 'Try a different search.' : 'Record a specific moment so you can compare it with later behavior.'}</p></div>
        : filtered.map(entry => <article key={entry.id} className="journal-entry">
          <div className="flex flex-wrap gap-x-3 gap-y-1 justify-between"><h3 className="font-bold">{entry.context.activity}</h3><time className="body-secondary" dateTime={entry.occurredAt}>{formatObservationTime(entry.occurredAt)}</time></div>
          <p className="body-secondary mt-1">{entry.context.environment}</p>
          {entry.cues.length > 0 && <ul className="tag-list mt-3">{entry.cues.map(cue => <li className="tag" key={cue}>{cue}</li>)}</ul>}
          <p className="mt-3 text-sm leading-6">{entry.context.notes}</p>
          {entry.legacyMigrated && <p className="body-secondary mt-2">Migrated note. Edit to add observed cues and context.</p>}
          {entry.hasMedia && <p className="body-secondary mt-2">Media was attached at save time. The clip itself is not stored.</p>}
          <button className="button-text mt-2" onClick={() => { setSelected(entry); setConfirmDelete(false); }}>View observation</button>
        </article>)}
    </div>
    {selected && <Modal label="Observation details" onClose={() => setSelected(null)}><div className="modal-panel surface w-full max-w-lg p-5 relative">
      <button className="icon-button absolute top-2 right-2" aria-label="Close observation" onClick={() => setSelected(null)}>×</button>
      <h2 className="heading-md pr-8">Observation details</h2><p className="body-secondary mt-1">{formatObservationTime(selected.occurredAt)}</p>
      <div className="mt-5 space-y-4"><div><h3 className="font-bold">Observed</h3><ul className="tag-list mt-2">{selected.cues.map(cue => <li className="tag" key={cue}>{cue}</li>)}</ul></div>
      <div><h3 className="font-bold">Context</h3><dl className="detail-list"><div><dt>Activity</dt><dd>{selected.context.activity}</dd></div><div><dt>Setting</dt><dd>{selected.context.environment}</dd></div>
      {selected.context.nearby && <div><dt>Nearby</dt><dd>{selected.context.nearby}</dd></div>}{selected.context.recentEvent && <div><dt>Just before</dt><dd>{selected.context.recentEvent}</dd></div>}</dl><p className="mt-2 text-sm leading-6">{selected.context.notes}</p></div>
      <div><h3 className="font-bold">Possible reading</h3><p className="mt-1 text-sm leading-6">{selected.interpretation ?? 'No specific suggestion was recorded. Keep observing patterns.'}</p><p className="body-secondary mt-1">Cue-based guidance, not a diagnosis or model result.</p></div></div>
      {confirmDelete ? <div className="danger-panel mt-5"><p className="font-bold">Delete this observation?</p><p className="text-sm mt-1">This cannot be undone. It only removes this browser's record.</p><div className="flex gap-2 mt-3"><button className="button-danger flex-1" onClick={() => { onDelete(selected.id); setSelected(null); }}>Delete permanently</button><button className="button-secondary flex-1" onClick={() => setConfirmDelete(false)}>Keep entry</button></div></div>
        : <div className="flex flex-wrap gap-2 mt-5"><button className="button-primary flex-1" onClick={() => { onEdit(selected); setSelected(null); }}>Edit observation</button><button className="button-danger-secondary" onClick={() => setConfirmDelete(true)}>Delete</button></div>}
    </div></Modal>}
  </section>;
}