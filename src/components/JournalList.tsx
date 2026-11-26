import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Download, Filter, Search, X } from 'lucide-react';
import { Observation, PetProfile } from '../types/journal';
import { Modal } from './modals/Modal';
import { formatObservationTime } from '../utils/journal';

type DateFilter = 'all' | 'today' | 'week' | 'month';

function observationDate(value: string) {
  return new Date(`${value}:00`);
}

function localDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(date: Date, today: Date) {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (localDayKey(date) === localDayKey(today)) return 'Today';
  if (localDayKey(date) === localDayKey(yesterday)) return 'Yesterday';
  return new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(date);
}

export function JournalList({ pet, observations, onEdit, onDelete, onExport }: {
  pet: PetProfile;
  observations: Observation[];
  onEdit: (observation: Observation) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
}) {
  const [selected, setSelected] = useState<Observation | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const today = new Date();
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);

  const filtered = useMemo(() => observations
    .filter(observation => {
      const textMatches = `${observation.cues.join(' ')} ${observation.context.activity} ${observation.context.environment} ${observation.context.notes}`.toLowerCase().includes(query.trim().toLowerCase());
      const time = observationDate(observation.occurredAt).getTime();
      const dateMatches = dateFilter === 'all' || (dateFilter === 'today' && time >= todayStart.getTime())
        || (dateFilter === 'week' && time >= todayStart.getTime() - 6 * 86_400_000)
        || (dateFilter === 'month' && time >= todayStart.getTime() - 29 * 86_400_000);
      return textMatches && dateMatches;
    })
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)), [observations, query, dateFilter, todayStart.getTime()]);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; entries: Observation[] }>();
    for (const entry of filtered) {
      const date = observationDate(entry.occurredAt);
      const key = localDayKey(date);
      const group = map.get(key) ?? { label: dayLabel(date, today), entries: [] };
      group.entries.push(entry);
      map.set(key, group);
    }
    return [...map.values()];
  }, [filtered, today]);

  return <section className="journal-screen">
    <header className="screen-heading journal-heading">
      <div><h1>{pet.name}’s journal</h1><p>Your notes, kept on this device.</p></div>
      <button className="journal-filter-button" type="button" aria-label="Filter journal entries" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(open => !open)}><Filter aria-hidden="true" /></button>
    </header>
    <label className="search-field journal-search"><Search aria-hidden="true" /><span className="sr-only">Search notes, cues or setting</span><input type="search" placeholder="Search notes, cues or setting" value={query} onChange={event => setQuery(event.target.value)} /></label>
    {filtersOpen && <div className="journal-date-filters" role="group" aria-label="Filter by date">
      {(['all', 'today', 'week', 'month'] as const).map(value => <button key={value} type="button" className={dateFilter === value ? 'is-active' : ''} aria-pressed={dateFilter === value} onClick={() => setDateFilter(value)}>{value === 'all' ? 'All time' : value === 'today' ? 'Today' : value === 'week' ? '7 days' : '30 days'}</button>)}
    </div>}
    <p className="journal-entry-count">{filtered.length} {filtered.length === 1 ? 'observation' : 'observations'}</p>

    {filtered.length ? <div className="journal-groups">{groups.map(group => <section className="journal-day-group" key={group.label}>
      <h2>{group.label}</h2>
      <div className="journal-group-entries">{group.entries.map(entry => <article key={entry.id} className="journal-card">
        <time className="journal-card-time" dateTime={entry.occurredAt}>{new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(observationDate(entry.occurredAt))}</time>
        <img className="journal-card-mascot" src={`/mascots/${pet.species}.webp`} alt="" />
        <div className="journal-card-copy">
          <h3>{entry.context.activity}</h3>
          <p className="journal-card-setting">{entry.context.environment}</p>
          {entry.cues.length > 0 && <ul className="journal-card-cues">{entry.cues.slice(0, 3).map(cue => <li key={cue}>{cue}</li>)}{entry.cues.length > 3 && <li>+{entry.cues.length - 3} more</li>}</ul>}
          <p className="journal-card-notes">{entry.context.notes}</p>
          {entry.hasMedia && <small className="journal-media-note">The clip was previewed locally and was not saved.</small>}
          {entry.legacyMigrated && <small className="journal-media-note">Older note · edit to add observed cues and context.</small>}
          <button className="journal-view-button" type="button" onClick={() => { setSelected(entry); setConfirmDelete(false); }}>View observation <ChevronRight aria-hidden="true" /></button>
        </div>
      </article>)}</div>
    </section>)}</div> : <div className="empty-state journal-empty-state">
      <img src={`/mascots/${pet.species}.webp`} alt="" />
      <h2>{observations.length ? 'No matching entries' : 'Your journal starts here'}</h2>
      <p>{observations.length ? 'Try another search or date range.' : 'Record a moment you notice, then compare it with what happens next.'}</p>
      {(query || dateFilter !== 'all') && <button className="button-text" onClick={() => { setQuery(''); setDateFilter('all'); }}>Clear filters</button>}
    </div>}

    <button className="journal-export-button" type="button" onClick={onExport}><Download aria-hidden="true" />Export journal (JSON)</button>

    {selected && <Modal label="Observation details" onClose={() => setSelected(null)}><div className="modal-panel observation-detail-sheet">
      <button className="icon-button observation-detail-close" type="button" aria-label="Close observation" onClick={() => setSelected(null)}><X aria-hidden="true" /></button>
      <h2>{selected.context.activity}</h2><p className="body-secondary">{formatObservationTime(selected.occurredAt)} · {selected.context.environment}</p>
      <div className="observation-detail-section"><h3>Observed cues</h3>{selected.cues.length ? <ul className="journal-card-cues">{selected.cues.map(cue => <li key={cue}>{cue}</li>)}</ul> : <p className="body-secondary">No cues were recorded in this migrated entry.</p>}</div>
      <div className="observation-detail-section"><h3>What happened</h3><p>{selected.context.notes}</p></div>
      {(selected.context.nearby || selected.context.recentEvent) && <div className="observation-detail-section"><h3>More context</h3>{selected.context.nearby && <p>Nearby: {selected.context.nearby}</p>}{selected.context.recentEvent && <p>Before: {selected.context.recentEvent}</p>}</div>}
      {selected.interpretation && <div className="observation-detail-reading"><h3>Possible reading</h3><p>{selected.interpretation}</p><small>Prototype cue-based guidance, not a diagnosis or model result.</small></div>}
      {confirmDelete ? <div className="danger-panel mt-5"><p className="font-bold">Delete this observation?</p><p className="text-sm mt-1">This cannot be undone. It only removes this browser’s record.</p><div className="flex gap-2 mt-3"><button className="button-danger flex-1" onClick={() => { onDelete(selected.id); setSelected(null); }}>Delete permanently</button><button className="button-secondary flex-1" onClick={() => setConfirmDelete(false)}>Keep entry</button></div></div>
        : <div className="observation-detail-actions"><button className="button-primary" onClick={() => { onEdit(selected); setSelected(null); }}>Edit observation</button><button className="button-danger-secondary" onClick={() => setConfirmDelete(true)}>Delete</button></div>}
    </div></Modal>}
  </section>;
}
