import type { BodyLanguageEntry } from '../data/bodyLanguage';

const INK = '#173b50';
const SKY = '#8dddf8';
const SUN = '#ffd958';
const PINK = '#f58fa5';

const ILLUSTRATION_BY_ID: Record<string, string> = {
  'cat-tail-up': 'tail-up', 'cat-tail-puffed': 'tail-puffed', 'cat-tail-lashing': 'tail-lashing',
  'cat-tail-tucked': 'tail-tucked', 'cat-tail-wrap': 'tail-wrap',
  'cat-ears-forward': 'ear-forward', 'cat-ears-swiveling': 'ear-swivel',
  'cat-ears-rotated-back': 'ear-airplane', 'cat-ears-flat': 'ear-flat',
  'cat-slow-blink': 'eye-blink', 'cat-staring': 'eye-wide', 'cat-squinting': 'eye-squint',
  'cat-pupils-dilated': 'eye-dilated', 'cat-pupils-constricted': 'eye-slit',
  'cat-whiskers-forward': 'whisker-forward', 'cat-whiskers-relaxed': 'whisker-relaxed',
  'cat-whiskers-flat': 'whisker-back', 'cat-arched-back-sideways': 'pose-arch',
  'cat-crouch-tense': 'pose-crouch', 'cat-loaf': 'pose-loaf', 'cat-belly-up': 'pose-belly-up',
  'cat-social-roll': 'pose-roll', 'cat-hunting-crouch': 'pose-pounce', 'cat-freezing': 'pose-freeze',
  'cat-purring': 'voice-purr', 'cat-trill-chirrup': 'voice-trill', 'cat-meowing': 'voice-meow',
  'cat-chattering': 'voice-chatter', 'cat-hissing': 'voice-hiss', 'cat-growling': 'voice-growl',
  'cat-yowling': 'voice-yowl', 'cat-head-bunting': 'action-rub', 'cat-kneading': 'action-knead',
  'cat-biting-petting': 'mouth-bite', 'cat-hiding': 'action-hide', 'cat-overgrooming': 'action-groom',
  'cat-displacement-grooming': 'action-quick-groom', 'cat-nose-licking': 'mouth-lick',
  'cat-scratching': 'action-scratch', 'cat-spraying': 'action-spray', 'cat-flehmen': 'mouth-flehmen',
  'cat-tail-low-stiff': 'tail-low', 'cat-resting-position': 'pose-rest', 'cat-bringing-prey': 'action-prey',
  'cat-zoomies': 'action-zoom', 'cat-sitting-on-your-things': 'action-sit-on',
  'cat-myth-tail-wag-happy': 'tail-myth', 'cat-myth-purring-always-happy': 'voice-myth-purr',
  'cat-myth-revenge-soiling': 'action-myth-spray',
  'dog-tail-loose-wag': 'tail-loose', 'dog-tail-helicopter': 'tail-helicopter',
  'dog-tail-high-stiff-wag': 'tail-stiff', 'dog-tail-tucked': 'tail-tucked',
  'dog-tail-wag-right-bias': 'tail-right', 'dog-tail-wag-left-bias': 'tail-left',
  'dog-ears-relaxed': 'ear-relaxed', 'dog-ears-forward': 'ear-forward', 'dog-ears-pinned-back': 'ear-pinned',
  'dog-whale-eye': 'eye-whale', 'dog-soft-eyes': 'eye-soft', 'dog-hard-stare': 'eye-stare',
  'dog-looking-away': 'eye-away', 'dog-dilated-pupils': 'eye-dilated', 'dog-puppy-eyes': 'eye-brows',
  'dog-relaxed-open-mouth': 'mouth-open', 'dog-closed-tight-mouth': 'mouth-long-lip',
  'dog-lip-lick': 'mouth-lick', 'dog-yawn': 'mouth-yawn', 'dog-lip-curl-snarl': 'mouth-snarl',
  'dog-submissive-grin': 'mouth-grin', 'dog-stress-panting': 'mouth-pant', 'dog-raised-hackles': 'body-hackles',
  'dog-play-bow': 'pose-play-bow', 'dog-rolling-over': 'pose-belly-up', 'dog-paw-lift': 'pose-paw-lift',
  'dog-low-posture-cowering': 'pose-cower', 'dog-freezing': 'pose-freeze',
  'dog-stiff-forward-stance': 'pose-stiff', 'dog-trembling': 'body-tremble', 'dog-shake-off': 'body-shake-off',
  'dog-scratching-sniffing': 'action-sniff-scratch', 'dog-pacing': 'action-pacing',
  'dog-zoomies': 'action-zoom', 'dog-submissive-urination': 'action-greeting-pee',
  'dog-guilty-look': 'eye-guilty', 'dog-snap': 'mouth-snap', 'dog-growl': 'voice-growl',
  'dog-bark': 'voice-bark', 'dog-whining': 'voice-whine', 'dog-sweaty-paws': 'body-pawprints',
  'dog-stress-shedding': 'body-shedding', 'dog-drooling': 'mouth-drool', 'dog-threat-bark': 'voice-threat-bark',
  'dog-lunge-charge': 'action-lunge', 'dog-control-mouthing': 'mouth-control',
  'dog-muzzle-punch': 'action-muzzle-punch', 'dog-nip': 'mouth-nip', 'dog-bite': 'mouth-bite',
  'dog-head-tilt': 'pose-head-tilt', 'dog-mounting': 'action-mount', 'dog-howling': 'voice-howl',
  'dog-calming-signals': 'action-calming',
};

export function cueIllustrationFor(id: string): string {
  return ILLUSTRATION_BY_ID[id] ?? 'cue-silhouette';
}

function Face({ species, glyph }: { species: 'cat' | 'dog'; glyph: string }) {
  const earForward = glyph === 'ear-forward';
  const earFlat = glyph === 'ear-flat' || glyph === 'ear-pinned';
  const earSwivel = glyph === 'ear-swivel' || glyph === 'ear-airplane';
  const eyes = glyph.startsWith('eye-') ? glyph : 'eye-default';
  const whiskers = glyph.startsWith('whisker-') ? glyph : 'whisker-default';
  const mouth = glyph.startsWith('mouth-') || glyph.startsWith('voice-') ? glyph : 'mouth-smile';
  const dog = species === 'dog';

  return <g stroke={INK} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    {dog ? <>
      <path d={earFlat ? 'M17 21Q7 14 8 26L17 31M47 21Q57 14 56 26L47 31' : 'M17 21Q8 16 9 29Q9 37 18 38M47 21Q56 16 55 29Q55 37 46 38'} fill={SUN} />
      {earForward && <path d="M17 22 15 10 25 17M47 22 49 10 39 17" fill={SUN} />}
    </> : <>
      <path d={earFlat ? 'M18 22Q12 17 11 22L17 28M46 22Q52 17 53 22L47 28' : 'M17 25 14 8 28 18M47 25 50 8 36 18'} fill={SUN} />
      <path d={earFlat ? 'M17 22 14 22M47 22 50 22' : 'M18 19 17 13 23 18M46 19 47 13 41 18'} fill="none" stroke={PINK} strokeWidth="2" />
      {earSwivel && <path d="M49 20Q58 13 57 24" fill="none" stroke={INK} strokeWidth="2.4" />}
    </>}
    <path d={dog ? 'M19 20Q32 14 45 20Q53 26 51 38Q48 51 32 53Q16 51 13 38Q11 27 19 20Z' : 'M18 20 16 9 28 17Q32 15 36 17L48 9 46 22Q52 30 49 40Q46 52 32 53Q18 52 14 41Q11 30 18 20Z'} fill={SKY} />
    {eyes === 'eye-blink' || eyes === 'eye-squint' || eyes === 'eye-soft' ? <>
      <path d={eyes === 'eye-blink' ? 'M21 29Q25 34 29 29M35 29Q39 34 43 29' : 'M21 30Q25 27 29 30M35 30Q39 27 43 30'} fill="none" />
    </> : eyes === 'eye-away' || eyes === 'eye-guilty' ? <>
      <ellipse cx="25" cy="29" rx="4" ry="5" fill="#fff9ef" /><ellipse cx="39" cy="29" rx="4" ry="5" fill="#fff9ef" />
      <circle cx="27" cy="30" r="2.2" fill={INK} stroke="none" /><circle cx="41" cy="30" r="2.2" fill={INK} stroke="none" />
    </> : eyes === 'eye-whale' ? <>
      <ellipse cx="25" cy="29" rx="6" ry="5" fill="#fff9ef" /><ellipse cx="39" cy="29" rx="6" ry="5" fill="#fff9ef" />
      <circle cx="21" cy="30" r="2.5" fill={INK} stroke="none" /><circle cx="35" cy="30" r="2.5" fill={INK} stroke="none" />
    </> : eyes === 'eye-wide' || eyes === 'eye-dilated' ? <>
      <ellipse cx="25" cy="29" rx={eyes === 'eye-wide' ? 5.5 : 5} ry="6" fill="#fff9ef" />
      <ellipse cx="39" cy="29" rx={eyes === 'eye-wide' ? 5.5 : 5} ry="6" fill="#fff9ef" />
      <circle cx="25" cy="29" r={eyes === 'eye-wide' ? 2.7 : 4} fill={INK} stroke="none" />
      <circle cx="39" cy="29" r={eyes === 'eye-wide' ? 2.7 : 4} fill={INK} stroke="none" />
    </> : eyes === 'eye-slit' ? <>
      <ellipse cx="25" cy="29" rx="5" ry="4" fill="#fff9ef" /><ellipse cx="39" cy="29" rx="5" ry="4" fill="#fff9ef" />
      <path d="M25 26v6M39 26v6" strokeWidth="3.5" />
    </> : <>
      <circle cx="25" cy="29" r="2.8" fill={INK} stroke="none" /><circle cx="39" cy="29" r="2.8" fill={INK} stroke="none" />
      {eyes === 'eye-brows' && <path d="M20 22q5-5 10-1m4 0q5-4 10 1" fill="none" stroke={SUN} strokeWidth="3.5" />}
      {eyes === 'eye-stare' && <path d="M20 22q5 3 10 0m4 0q5 3 10 0" fill="none" strokeWidth="3.2" />}
    </>}
    {dog ? <ellipse cx="32" cy="39" rx="13" ry="8" fill="#fff9ef" /> : <path d="M24 38q8-7 16 0l-8 7z" fill="#fff9ef" />}
    <path d="M29 38 32 36 35 38 32 41Z" fill={PINK} />
    {whiskers !== 'whisker-default' && <g fill="none" strokeWidth="2.1">
      <path d={whiskers === 'whisker-forward' ? 'M23 40 10 36M23 43 9 43M41 40 54 36M41 43 55 43' : whiskers === 'whisker-back' ? 'M23 40 12 45M23 43 13 49M41 40 52 45M41 43 51 49' : 'M22 40 11 39M22 43 10 45M42 40 53 39M42 43 54 45'} />
    </g>}
    {mouth === 'mouth-open' || mouth === 'voice-meow' || mouth === 'voice-bark' || mouth === 'voice-yowl' || mouth === 'voice-howl' || mouth === 'voice-threat-bark' ? <>
      <ellipse cx="32" cy="46" rx={mouth === 'voice-yowl' || mouth === 'voice-howl' ? 5 : 4} ry={mouth === 'voice-yowl' ? 6 : 4} fill={PINK} />
      {mouth.startsWith('voice-') && <path d="M49 35q6 5 0 10M53 32q9 8 0 16" fill="none" stroke={SUN} strokeWidth="2.2" />}
    </> : mouth === 'mouth-yawn' ? <ellipse cx="32" cy="44" rx="6" ry="8" fill={PINK} />
      : mouth === 'mouth-lick' ? <><path d="M32 41q-6 3-4 7q3 3 6-2" fill={PINK} /><path d="M28 45l-3 2" fill="none" /></>
        : mouth === 'mouth-flehmen' ? <><path d="M28 43h8v5h-8z" fill={PINK} /><path d="m28 45-4-2m12 2 4-2" /></>
          : mouth === 'mouth-snarl' || mouth === 'mouth-snap' || mouth === 'mouth-bite' || mouth === 'mouth-nip' || mouth === 'mouth-control' ? <>
            <path d={mouth === 'mouth-nip' ? 'M27 44q5-7 10 0q-5 7-10 0Z' : 'M26 43q6-7 12 0q-6 8-12 0Z'} fill={PINK} />
            <path d="m28 41 2 4 2-4 2 4 2-4" fill="#fff9ef" strokeWidth="1.4" />
          </> : mouth === 'mouth-grin' ? <><path d="M25 42q7 8 14 0" fill="#fff9ef" /><path d="M27 44h10" strokeWidth="1.6" /></>
            : mouth === 'mouth-pant' ? <><path d="M26 42q6 6 12 0" /><path d="M29 44q-2 7 3 7q5 0 3-7" fill={PINK} /></>
              : mouth === 'mouth-drool' ? <><path d="M26 42q6 6 12 0" /><path d="M40 42q4 5 0 8q-4-3 0-8Z" fill={SKY} /></>
                : mouth === 'mouth-long-lip' ? <><path d="M26 42q6-3 12 0" /><path d="M22 39q-4 2-5 5m25-5q4 2 5 5" /></>
                  : <path d="M26 42q6 7 12 0" fill="none" />}
    {mouth === 'voice-purr' || mouth === 'voice-myth-purr' ? <><path d="M7 37q-4 4 0 8m50-8q4 4 0 8" fill="none" stroke={SUN} strokeWidth="2.4" /><path d="M51 13q5-5 8 0q0 5-8 10q-8-5-8-10q3-5 8 0Z" fill={PINK} strokeWidth="1.8" /></> : null}
    {mouth === 'voice-trill' && <path d="M17 11q4-4 8 0m-4-6q4-3 8 0" fill="none" stroke={SUN} strokeWidth="2.2" />}
    {mouth === 'voice-chatter' && <path d="M21 46h22m-17-3v5m5-5v5m5-5v5" fill="none" stroke={SUN} strokeWidth="2.1" />}
    {mouth === 'voice-hiss' && <path d="M22 20 18 15m24 5 4-5M19 47l-4 3m30-3 4 3" fill="none" stroke={PINK} strokeWidth="2.4" />}
    {mouth === 'voice-growl' && <path d="M20 13q-5 3 0 6m24-6q5 3 0 6" fill="none" stroke={PINK} strokeWidth="2.1" />}
    {mouth === 'voice-whine' && <path d="M11 38q-4 3 0 6m4-11q-4 4 0 8" fill="none" stroke={SKY} strokeWidth="2.4" />}
  </g>;
}

function TailScene({ glyph, species }: { glyph: string; species: 'cat' | 'dog' }) {
  const tail = glyph === 'tail-up' ? 'M17 32Q7 28 10 16Q11 8 19 11Q25 13 21 19'
    : glyph === 'tail-puffed' ? 'M17 32Q7 27 9 16L5 12 11 9 8 4 15 6 18 1 22 9Q27 16 21 22'
      : glyph === 'tail-tucked' ? 'M17 36Q7 39 10 47Q13 51 21 47'
        : glyph === 'tail-wrap' ? 'M17 37Q5 39 8 48Q12 54 23 48Q27 44 20 42'
          : glyph === 'tail-low' ? 'M17 33Q7 36 7 44'
            : glyph === 'tail-stiff' ? 'M17 31Q5 29 4 19L5 12'
              : glyph === 'tail-helicopter' ? 'M17 31Q4 27 8 19Q12 14 18 20Q23 25 16 27Q11 29 12 22'
                : glyph === 'tail-right' ? 'M17 31Q7 26 12 18'
                  : glyph === 'tail-left' ? 'M17 31Q5 38 12 45'
                    : glyph === 'tail-loose' ? 'M17 32Q7 28 10 20Q14 14 19 19'
                      : 'M17 32Q7 29 10 20Q14 14 19 19';
  return <g stroke={INK} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 36Q15 25 27 24Q39 22 43 29Q46 34 43 43L20 45Q16 43 16 36Z" fill={SKY} />
    <path d={tail} fill="none" stroke={glyph === 'tail-puffed' ? SUN : INK} strokeWidth={glyph === 'tail-puffed' ? 5 : 3.5} />
    <path d="M39 30Q43 24 48 26L53 29 47 33Q44 34 42 33Z" fill={SUN} />
    {species === 'cat' ? <path d="M42 27 41 21 46 25m0 2 4-5 1 7" fill={SUN} /> : <path d="M44 25q5-5 7 0v5" fill={SUN} />}
    <circle cx="48" cy="29" r="1.4" fill={INK} stroke="none" />
    <path d="M23 43v7m11-7v7m8-8v8" />
    {['tail-lashing', 'tail-loose', 'tail-right', 'tail-left', 'tail-helicopter', 'tail-myth'].includes(glyph) && <path d={glyph === 'tail-right' ? 'M5 21l4-3m-5 9 5-1' : glyph === 'tail-left' ? 'M5 40l5 2m-4-8 5 1' : 'M5 15l4 3m-5 6 5-1'} fill="none" stroke={SUN} strokeWidth="2.4" />}
    {glyph === 'tail-myth' && <path d="M49 6q4-5 8-1q3 4-6 10l-4-4" fill={PINK} strokeWidth="2" />}
    {glyph === 'tail-stiff' && <path d="M10 12l-3-4m10 4V6m5 8 4-4" fill="none" stroke={PINK} strokeWidth="2.2" />}
  </g>;
}

function Profile({ glyph }: { glyph: string }) {
  const body = glyph === 'pose-play-bow' ? 'M13 31Q22 27 34 30L44 38 42 43Q31 42 24 39L18 48 14 48 17 38 11 36Z'
    : glyph === 'pose-belly-up' || glyph === 'pose-roll' ? 'M15 40Q16 28 28 28Q41 28 47 38L44 44Q29 48 16 44Z'
      : glyph === 'pose-arch' ? 'M14 38Q17 30 24 32Q31 20 39 30Q45 32 47 39L44 44 18 44Z'
        : glyph === 'pose-crouch' || glyph === 'pose-pounce' || glyph === 'pose-cower' ? 'M14 39Q15 32 25 32L37 34Q45 32 49 36L48 42 20 45Z'
          : glyph === 'pose-loaf' ? 'M15 41Q15 28 27 27Q42 27 48 39L45 45H18Z'
            : glyph === 'pose-rest' ? 'M12 40Q16 28 27 30Q39 27 48 39Q43 48 30 47Q16 48 12 40Z'
              : glyph === 'pose-freeze' || glyph === 'pose-stiff' ? 'M15 35Q17 23 31 23Q43 23 46 33L43 42 18 42Z'
                : glyph === 'pose-paw-lift' ? 'M15 37Q17 25 31 25Q44 25 47 36L44 42H18Z'
                  : glyph === 'pose-head-tilt' ? 'M15 36Q16 25 30 25Q43 25 47 35L44 42H18Z'
                    : glyph === 'pose-tremble' || glyph === 'pose-shake-off' ? 'M13 36Q17 26 30 27Q43 26 49 37L45 43H18Z'
                      : 'M15 36Q17 25 31 25Q44 25 47 35L44 42H18Z';
  return <g stroke={INK} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    {glyph === 'pose-belly-up' || glyph === 'pose-roll' ? <path d={body} fill={SUN} /> : <path d={body} fill={SKY} />}
    <circle cx={glyph === 'pose-play-bow' ? 47 : 43} cy={glyph === 'pose-play-bow' ? 38 : 29} r="7" fill={SUN} />
    <path d={glyph === 'pose-play-bow' ? 'M43 33 41 27 47 31' : 'M40 24 39 18 44 23m3 2 5-4 0 7'} fill={SUN} />
    <circle cx="46" cy="29" r="1.2" fill={INK} stroke="none" />
    {glyph === 'pose-play-bow' ? <path d="M20 39v8m5-7 2 7m13-5 1 6m4-6 2 6" />
      : glyph === 'pose-belly-up' || glyph === 'pose-roll' ? <path d="M20 34 13 28m12 2-2-9m12 9 5-9m2 13 9-5" />
        : glyph === 'pose-loaf' ? <path d="M20 42q4-7 8 0m2 0q4-7 8 0" />
          : glyph === 'pose-crouch' || glyph === 'pose-pounce' || glyph === 'pose-cower' ? <path d="M20 41v4m7-4v4m11-5 5 3" />
            : glyph === 'pose-paw-lift' ? <path d="M20 39v7m10-6v7m9-9 6-8" />
              : <path d="M20 40v7m9-7v7m8-8v8m7-10v9" />}
    {glyph === 'pose-pounce' && <path d="M16 26q7-4 14 0" fill="none" stroke={PINK} strokeWidth="2.5" />}
    {glyph === 'pose-roll' && <path d="M7 32a23 23 0 0 1 12-20m-5 0 6 0-2 6" fill="none" stroke={SUN} strokeWidth="2.5" />}
    {glyph === 'pose-freeze' && <path d="M7 22v17m-3-5 3 5 3-5m43-15v18m-3-5 3 5 3-5" fill="none" stroke={PINK} strokeWidth="2.2" />}
    {glyph === 'pose-cower' && <path d="M17 30 11 26m5 9-7-1" fill="none" stroke={PINK} strokeWidth="2.4" />}
    {glyph === 'pose-stiff' && <path d="M16 20v-8m6 8v-8m-9 3h12" fill="none" stroke={PINK} strokeWidth="2" />}
    {glyph === 'pose-tremble' && <path d="M8 29l-3 3 3 3m48-6 3 3-3 3" fill="none" stroke={PINK} strokeWidth="2.2" />}
    {glyph === 'pose-shake-off' && <path d="M10 21q-5 4 0 8m44-8q5 4 0 8" fill="none" stroke={SKY} strokeWidth="2.4" />}
    {glyph === 'pose-head-tilt' && <path d="M55 15q4 5 0 10m-4-3 4 4 4-4" fill="none" stroke={SUN} strokeWidth="2.2" />}
    {glyph === 'pose-rest' && <path d="M11 18q-5 0-5 5m8-10q-6-1-8 4" fill="none" stroke={SUN} strokeWidth="2.2" />}
  </g>;
}

function Action({ glyph, species }: { glyph: string; species: 'cat' | 'dog' }) {
  if (glyph === 'body-pawprints') return <g fill={SKY} stroke={INK} strokeWidth="2.1" strokeLinejoin="round">
    <path d="M16 35q-5-3-5-8 0-4 4-4t5 5q1-5 5-5t4 5q0 8-7 9Z" /><path d="M38 48q-5-3-5-8 0-4 4-4t5 5q1-5 5-5t4 5q0 8-7 9Z" />
  </g>;
  if (glyph === 'action-knead') return <g stroke={INK} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 45q1-14 18-14t20 14Z" fill={SKY} /><path d="M21 29q0-9 5-9t5 10m4-1q0-9 5-9t5 10" fill="none" /><path d="M19 42q5-4 10 0m5 0q5-4 10 0" fill="none" stroke={SUN} strokeWidth="3" /></g>;
  if (glyph === 'action-hide') return <g stroke={INK} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 48V26L32 10l22 16v22H10Z" fill="#fff9ef" /><path d="M21 47V34q0-9 11-9t11 9v13" fill={SKY} /><circle cx="28" cy="35" r="1.4" fill={INK} /><circle cx="36" cy="35" r="1.4" fill={INK} /><path d="M29 40q3 3 6 0" fill="none" /></g>;
  if (glyph === 'action-scratch') return <g stroke={INK} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M37 12v38m-8 0h17" /><path d="M14 42q8-8 16-3l6 5-2 5-13-1Z" fill={SKY} /><path d="m25 37 5-6m-1 10 8-4m-9-5 2-8" fill="none" stroke={SUN} strokeWidth="2.4" /></g>;
  if (glyph === 'action-spray' || glyph === 'action-myth-spray' || glyph === 'action-greeting-pee') return <g stroke={INK} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M52 14v38M48 52h9" /><path d="M13 38q2-12 17-12 9 0 13 8l-3 9H18Z" fill={SKY} /><path d="M15 34Q6 28 11 20" fill="none" stroke={SUN} strokeWidth="4" /><path d={glyph === 'action-myth-spray' ? 'M42 22l-12 18m0-18 12 18' : 'M45 31l5 3m-5 3 5 3'} fill="none" stroke={PINK} strokeWidth="2.5" /></g>;
  if (glyph === 'action-prey') return <g stroke={INK} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 48h48" /><ellipse cx="36" cy="39" rx="10" ry="7" fill={SKY} /><circle cx="46" cy="35" r="5" fill={SKY} /><path d="M44 30q-1-8 5-8t5 8" fill={SUN} /><circle cx="48" cy="35" r="1.2" fill={INK} /><path d="M26 38q-9-13-16-2l9 8h7" fill={SUN} /></g>;
  if (glyph === 'action-sit-on') return <g stroke={INK} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 43h47v9H9z" fill={SUN} /><path d="M20 40q0-16 12-16t13 16l-4 4H23Z" fill={SKY} /><circle cx="32" cy="20" r="8" fill={SKY} /><path d="M26 16 24 9l8 5 8-5-2 8" fill={SUN} /></g>;
  if (glyph === 'action-mount') return <g stroke={INK} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 48q1-11 14-11t15 10l-3 4H12Z" fill={SKY} /><circle cx="17" cy="31" r="6" fill={SUN} /><path d="M21 34q8-13 20-10 8 2 9 10l-4 7H25Z" fill={SKY} /><circle cx="47" cy="22" r="6" fill={SUN} /><path d="M44 17v-5m6 5 4-4" /></g>;
  if (glyph === 'action-pacing' || glyph === 'action-zoom' || glyph === 'action-lunge') return <g stroke={INK} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 39q1-11 15-12 10 0 14 8l-3 7H19Z" fill={SKY} /><circle cx="45" cy="28" r="7" fill={SUN} /><path d={glyph === 'action-lunge' ? 'M15 34 6 28m13 8L8 40m8-13-4-8' : 'M22 41 14 50m19-8 2 8m10-21 8-5'} /><path d={glyph === 'action-zoom' ? 'M9 18l7 2m-9 5 8 0m30-14-4 5' : 'M12 17q-4 5 0 9m42-9q4 5 0 9'} fill="none" stroke={PINK} strokeWidth="2.3" /></g>;
  if (glyph === 'action-rub') return <g stroke={INK} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M50 10v43M46 53h8" /><path d="M12 40q0-13 13-13t14 13l-3 8H15Z" fill={SKY} /><path d="M20 27 18 18l9 6 8-7-1 12" fill={SUN} /><path d="M39 30l7-4m-7 8 7 0" stroke={PINK} strokeWidth="2.5" /></g>;
  if (glyph === 'action-groom' || glyph === 'action-quick-groom' || glyph === 'action-sniff-scratch' || glyph === 'action-muzzle-punch' || glyph === 'action-calming') {
    const faceGlyph = glyph === 'action-calming' ? 'eye-away' : glyph === 'action-sniff-scratch' ? 'mouth-flehmen' : glyph === 'action-groom' ? 'mouth-lick' : 'mouth-lick';
    return <g><Face species={species} glyph={faceGlyph} />{glyph === 'action-quick-groom' && <path d="M7 14l4-3m-4 8 5-1" stroke={PINK} strokeWidth="2.5" fill="none" />}{glyph === 'action-muzzle-punch' && <path d="M49 34h9m-6-4 5 4-5 4" stroke={SUN} strokeWidth="2.5" fill="none" />}</g>;
  }
  if (glyph === 'body-hackles' || glyph === 'body-shedding' || glyph === 'body-tremble' || glyph === 'body-shake-off') {
    return <g stroke={INK} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 38q1-12 15-13 12-1 17 8l-2 10H15Z" fill={SKY} /><circle cx="45" cy="29" r="7" fill={SUN} /><path d="M16 40v8m10-9v9m10-9v9" />
      {glyph === 'body-hackles' ? <path d="m20 25 2-7 4 6 4-9 3 9 5-5 1 8" fill={PINK} /> : glyph === 'body-shedding' ? <path d="M18 17l-3-4m10 3v-5m7 5 3-4m4 8 5-4" stroke={SUN} /> : <path d="M7 25l-3 3 3 3m48-6 3 3-3 3M9 42l-3 3 3 3" stroke={PINK} />}
    </g>;
  }
  return <Profile glyph={glyph.startsWith('pose-') ? glyph : 'pose-stiff'} />;
}

export function CueIllustration({ entry }: { entry: BodyLanguageEntry }) {
  const glyph = cueIllustrationFor(entry.id);
  const species = entry.species;
  const isTail = glyph.startsWith('tail-');
  const isFace = glyph.startsWith('ear-') || glyph.startsWith('eye-') || glyph.startsWith('whisker-') || glyph.startsWith('mouth-') || glyph.startsWith('voice-');
  return <svg className="cue-art" viewBox="0 0 64 64" data-cue-illustration={glyph} aria-hidden="true" focusable="false">
    {isTail ? <TailScene glyph={glyph} species={species} />
      : isFace ? <Face species={species} glyph={glyph} />
        : glyph.startsWith('pose-') ? <Profile glyph={glyph} />
          : <Action glyph={glyph} species={species} />}
  </svg>;
}
