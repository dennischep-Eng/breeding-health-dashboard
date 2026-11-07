import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Baby, HeartPulse, Loader2, Milk, Syringe, X } from 'lucide-react'
import {
  addDays,
  ANIMAL_STATUSES,
  BREEDING_METHODS,
  CALVING_EASE,
  daysBetween,
  formatDate,
  GESTATION_DAYS,
  HEALTH_CATEGORIES,
  label,
  PREG_CHECK_FROM_DAYS,
  todayISO,
  type AnimalProfile,
} from '../lib/herd'
import { addBreeding, addCalving, addHealth, saveAnimal } from '../lib/herd.functions'
import { useHerd, useSummary } from '../lib/useHerd'
import { Field, ReproBadge, Segmented } from './ui'

export type EntryKind = 'breeding' | 'calving' | 'health' | 'animal'
export type EntryPreset = { animalId?: number; category?: string }

const kinds: { value: EntryKind; label: string; icon: typeof Milk }[] = [
  { value: 'breeding', label: 'Service', icon: Syringe },
  { value: 'calving', label: 'Calving', icon: Baby },
  { value: 'health', label: 'Health', icon: HeartPulse },
  { value: 'animal', label: 'Animal', icon: Milk },
]

const COMMON_CONDITIONS: Record<string, string[]> = {
  mastitis: ['Clinical mastitis — LF quarter', 'Clinical mastitis — RF quarter', 'Clinical mastitis — LH quarter', 'Clinical mastitis — RH quarter', 'High SCC'],
  lameness: ['Sole ulcer', 'Digital dermatitis', 'White line disease', 'Foul in the foot', 'Routine hoof trim'],
  metabolic: ['Milk fever', 'Ketosis', 'Displaced abomasum', 'Grass staggers'],
  reproductive: ['Retained placenta', 'Metritis', 'Cystic ovary', 'Not seen bulling'],
  respiratory: ['Pneumonia', 'IBR signs'],
  digestive: ['Scour', 'Bloat', 'Off feed'],
  vaccination: ['BVD booster', 'Leptospirosis', 'IBR marker', 'Clostridial'],
  other: ['Injury', 'Eye infection', 'Lumpy jaw'],
}

export function EntrySheet({
  initialKind,
  preset,
  onClose,
  onSaved,
}: {
  initialKind: EntryKind
  preset?: EntryPreset
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [kind, setKind] = useState<EntryKind>(initialKind)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-xl border-0 bg-card p-0 text-ink shadow-2xl sm:rounded-l-2xl"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 id={titleId} className="text-2xl text-pasture-900">
            New record
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={() => ref.current?.close()} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="border-b border-line px-6 py-3">
          <div role="tablist" aria-label="Record type" className="grid grid-cols-4 gap-1 rounded-xl bg-paper p-1">
            {kinds.map(({ value, label: text, icon: Icon }) => (
              <button
                key={value}
                role="tab"
                aria-selected={kind === value}
                onClick={() => setKind(value)}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold transition ${
                  kind === value ? 'bg-card text-pasture-700 shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {text}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {kind === 'breeding' && <BreedingForm preset={preset} onSaved={onSaved} onClose={() => ref.current?.close()} />}
          {kind === 'calving' && <CalvingForm preset={preset} onSaved={onSaved} onClose={() => ref.current?.close()} />}
          {kind === 'health' && <HealthForm preset={preset} onSaved={onSaved} onClose={() => ref.current?.close()} />}
          {kind === 'animal' && <AnimalForm onSaved={onSaved} onClose={() => ref.current?.close()} />}
        </div>
      </div>
    </dialog>
  )
}

// ---------- shared pieces ----------

type FormProps = { preset?: EntryPreset; onSaved: (m: string) => void; onClose: () => void }

function useSave() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async (fn: () => Promise<unknown>) => {
    setPending(true)
    setError(null)
    try {
      await fn()
      await router.invalidate()
      return true
    } catch (e) {
      setError(readError(e))
      return false
    } finally {
      setPending(false)
    }
  }
  return { pending, error, setError, run }
}

function readError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  try {
    const parsed = JSON.parse(msg)
    if (Array.isArray(parsed) && parsed[0]?.message) return parsed[0].message
  } catch {
    /* not JSON */
  }
  return msg || 'Something went wrong saving this record'
}

function useAnimalPicker(initialId?: number) {
  const { animals } = useHerd()
  const { profiles } = useSummary()
  const initial = animals.find((a) => a.id === initialId)
  const [text, setText] = useState(initial?.tag ?? '')
  const profile = useMemo<AnimalProfile | undefined>(() => {
    const q = text.trim().toLowerCase()
    if (!q) return undefined
    return profiles.find((p) => p.animal.tag.toLowerCase() === q || p.animal.name.toLowerCase() === q)
  }, [text, profiles])
  return { text, setText, profile, profiles }
}

function AnimalPicker({ picker, autoFocus }: { picker: ReturnType<typeof useAnimalPicker>; autoFocus?: boolean }) {
  const id = useId()
  const listId = `${id}-list`
  const { text, setText, profile, profiles } = picker
  const p = profile
  return (
    <Field label="Animal (ear tag or name)" htmlFor={id}>
      <input
        id={id}
        className="field font-semibold tracking-wide uppercase placeholder:normal-case placeholder:tracking-normal"
        list={listId}
        value={text}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder="Start typing a tag, e.g. UK1107"
        onChange={(e) => setText(e.target.value)}
        aria-invalid={text.trim() !== '' && !p}
      />
      <datalist id={listId}>
        {profiles
          .filter((x) => x.reproStatus !== 'inactive')
          .map((x) => (
            <option key={x.animal.id} value={x.animal.tag}>
              {x.animal.name ? `${x.animal.name} · ` : ''}
              {label(x.animal.status)}
            </option>
          ))}
      </datalist>
      {p ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-pasture-50 px-3 py-2 text-xs text-pasture-900">
          <strong className="text-sm">{p.animal.name || p.animal.tag}</strong>
          <ReproBadge status={p.reproStatus} />
          <span>Lact. {p.animal.lactation}</span>
          {p.daysInMilk !== null && <span>{p.daysInMilk} DIM</span>}
          {p.lastBreeding && <span>Last service {formatDate(p.lastBreeding.date)}</span>}
          {p.dueDate && <span className="font-semibold">Due {formatDate(p.dueDate)}</span>}
          {p.withdrawalUntil && <span className="font-semibold text-clay-700">Withdrawal to {formatDate(p.withdrawalUntil)}</span>}
        </div>
      ) : text.trim() ? (
        <p className="mt-1 text-xs text-clay-700">No animal with that tag. Add it on the Animal tab first.</p>
      ) : null}
    </Field>
  )
}

function Actions({ pending, error, onClose }: { pending: boolean; error: string | null; onClose: () => void }) {
  return (
    <div className="sticky bottom-0 -mx-6 mt-6 border-t border-line bg-card px-6 pt-4 pb-2">
      {error ? (
        <p role="alert" className="mb-3 rounded-lg bg-clay-100 px-3 py-2 text-sm text-clay-700">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" name="intent" value="close" className="btn btn-primary" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Save record
        </button>
        <button type="submit" name="intent" value="another" className="btn btn-ghost" disabled={pending}>
          Save &amp; add another
        </button>
        <button type="button" className="btn ml-auto text-muted hover:text-ink" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function intentOf(e: FormEvent<HTMLFormElement>) {
  const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
  return submitter?.value === 'another' ? 'another' : 'close'
}

function uniqueRecent(values: string[], limit = 8) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of values) {
    const t = v.trim()
    if (t && !seen.has(t)) {
      seen.add(t)
      out.push(t)
      if (out.length >= limit) break
    }
  }
  return out
}

function Suggestions({ id, values }: { id: string; values: string[] }) {
  return (
    <datalist id={id}>
      {values.map((v) => (
        <option key={v} value={v} />
      ))}
    </datalist>
  )
}

// ---------- breeding ----------

function BreedingForm({ preset, onSaved, onClose }: FormProps) {
  const { breeding } = useHerd()
  const picker = useAnimalPicker(preset?.animalId)
  const save = useSave()
  const base = useId()
  const [date, setDate] = useState(todayISO())
  const [method, setMethod] = useState<(typeof BREEDING_METHODS)[number]>('ai')
  const [sire, setSire] = useState('')
  const [technician, setTechnician] = useState('')
  const [notes, setNotes] = useState('')

  const recent = [...breeding].sort((a, b) => (a.date < b.date ? 1 : -1))
  const sires = uniqueRecent(recent.map((b) => b.sire))
  const techs = uniqueRecent(recent.map((b) => b.technician))
  const p = picker.profile
  const warn =
    p?.reproStatus === 'pregnant'
      ? 'This animal is recorded as pregnant — check before serving.'
      : p?.lastCalving && daysBetween(p.lastCalving.date, date) < 40
        ? `Only ${daysBetween(p.lastCalving.date, date)} days since calving.`
        : null

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const intent = intentOf(e)
    if (!p) return save.setError('Choose an animal from the herd list')
    const ok = await save.run(() =>
      addBreeding({ data: { animalId: p.animal.id, date, method, sire, technician, pregnancyResult: 'pending', checkDate: null, notes } }),
    )
    if (!ok) return
    onSaved(`Service recorded for ${p.animal.tag}`)
    if (intent === 'close') onClose()
    else {
      picker.setText('')
      setNotes('')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <AnimalPicker picker={picker} autoFocus={!preset?.animalId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Service date" htmlFor={`${base}-date`}>
          <input id={`${base}-date`} type="date" className="field" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Method">
          <Segmented name="Method" value={method} onChange={setMethod} options={BREEDING_METHODS.map((m) => ({ value: m, label: m === 'ai' ? 'AI' : m === 'natural' ? 'Bull' : 'ET' }))} />
        </Field>
        <Field label="Sire" htmlFor={`${base}-sire`}>
          <input id={`${base}-sire`} className="field" list={`${base}-sires`} value={sire} onChange={(e) => setSire(e.target.value)} placeholder="Bull name or code" />
          <Suggestions id={`${base}-sires`} values={sires} />
        </Field>
        <Field label="Technician" htmlFor={`${base}-tech`}>
          <input id={`${base}-tech`} className="field" list={`${base}-techs`} value={technician} onChange={(e) => setTechnician(e.target.value)} />
          <Suggestions id={`${base}-techs`} values={techs} />
        </Field>
      </div>
      <Field label="Notes" htmlFor={`${base}-notes`}>
        <textarea id={`${base}-notes`} className="field" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Heat signs, straw batch…" />
      </Field>
      {date ? (
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-dashed border-line p-4 text-sm">
          <div>
            <p className="field-label">Pregnancy check from</p>
            <p className="font-semibold">{formatDate(addDays(date, PREG_CHECK_FROM_DAYS))}</p>
          </div>
          <div>
            <p className="field-label">Due if conceived</p>
            <p className="font-semibold">{formatDate(addDays(date, GESTATION_DAYS))}</p>
          </div>
        </div>
      ) : null}
      {warn ? <p className="rounded-lg bg-straw-100 px-3 py-2 text-sm text-straw-700">{warn}</p> : null}
      <Actions pending={save.pending} error={save.error} onClose={onClose} />
    </form>
  )
}

// ---------- calving ----------

function CalvingForm({ preset, onSaved, onClose }: FormProps) {
  const picker = useAnimalPicker(preset?.animalId)
  const save = useSave()
  const base = useId()
  const [date, setDate] = useState(todayISO())
  const [ease, setEase] = useState(1)
  const [calfSex, setCalfSex] = useState<'heifer' | 'bull' | 'twins'>('heifer')
  const [outcome, setOutcome] = useState<'alive' | 'stillborn'>('alive')
  const [calfTag, setCalfTag] = useState('')
  const [weight, setWeight] = useState('')
  const [registerCalf, setRegisterCalf] = useState(true)
  const [notes, setNotes] = useState('')
  const p = picker.profile
  const dueDiff = p?.dueDate ? daysBetween(p.dueDate, date) : null

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const intent = intentOf(e)
    if (!p) return save.setError('Choose an animal from the herd list')
    const ok = await save.run(() =>
      addCalving({
        data: { animalId: p.animal.id, date, ease, calfSex, outcome, calfTag, calfWeightKg: weight === '' ? null : Number(weight), notes, registerCalf },
      }),
    )
    if (!ok) return
    onSaved(`Calving recorded for ${p.animal.tag}${registerCalf && calfTag && outcome === 'alive' && calfSex !== 'bull' ? ` · ${calfTag} added to herd` : ''}`)
    if (intent === 'close') onClose()
    else {
      picker.setText('')
      setCalfTag('')
      setWeight('')
      setNotes('')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <AnimalPicker picker={picker} autoFocus={!preset?.animalId} />
      {dueDiff !== null ? (
        <p className="text-sm text-muted">
          Expected {formatDate(p!.dueDate)} —{' '}
          <strong className="text-ink">{dueDiff === 0 ? 'on time' : `${Math.abs(dueDiff)} days ${dueDiff < 0 ? 'early' : 'late'}`}</strong>
        </p>
      ) : null}
      <Field label="Calving date" htmlFor={`${base}-date`} className="sm:w-1/2">
        <input id={`${base}-date`} type="date" className="field" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} required />
      </Field>
      <Field label="Calving ease">
        <Segmented
          name="Calving ease"
          value={ease}
          onChange={setEase}
          options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n} · ${CALVING_EASE[n]}` }))}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Calf">
          <Segmented name="Calf sex" value={calfSex} onChange={setCalfSex} options={[{ value: 'heifer', label: 'Heifer' }, { value: 'bull', label: 'Bull' }, { value: 'twins', label: 'Twins' }]} />
        </Field>
        <Field label="Outcome">
          <Segmented name="Outcome" value={outcome} onChange={setOutcome} options={[{ value: 'alive', label: 'Alive' }, { value: 'stillborn', label: 'Stillborn' }]} />
        </Field>
        <Field label="Calf tag" htmlFor={`${base}-calf`}>
          <input id={`${base}-calf`} className="field uppercase" value={calfTag} onChange={(e) => setCalfTag(e.target.value)} placeholder="Optional" />
        </Field>
        <Field label="Birth weight (kg)" htmlFor={`${base}-wt`}>
          <input id={`${base}-wt`} type="number" min={0} max={120} step="0.5" inputMode="decimal" className="field" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </Field>
      </div>
      {calfSex !== 'bull' && outcome === 'alive' ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-pasture-600" checked={registerCalf} onChange={(e) => setRegisterCalf(e.target.checked)} />
          Add heifer calf to the herd as a replacement (needs a calf tag)
        </label>
      ) : null}
      <Field label="Notes" htmlFor={`${base}-notes`}>
        <textarea id={`${base}-notes`} className="field" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Presentation, colostrum given…" />
      </Field>
      <p className="text-xs text-muted">Saving starts a new lactation: the dam is set to Milking and her lactation number goes up by one.</p>
      <Actions pending={save.pending} error={save.error} onClose={onClose} />
    </form>
  )
}

// ---------- health ----------

function HealthForm({ preset, onSaved, onClose }: FormProps) {
  const { health } = useHerd()
  const picker = useAnimalPicker(preset?.animalId)
  const save = useSave()
  const base = useId()
  const [date, setDate] = useState(todayISO())
  const [category, setCategory] = useState<(typeof HEALTH_CATEGORIES)[number]>(
    (HEALTH_CATEGORIES as readonly string[]).includes(preset?.category ?? '') ? (preset!.category as (typeof HEALTH_CATEGORIES)[number]) : 'mastitis',
  )
  const [condition, setCondition] = useState('')
  const [treatment, setTreatment] = useState('')
  const [givenBy, setGivenBy] = useState('')
  const [withdrawalDays, setWithdrawalDays] = useState('')
  const [resolved, setResolved] = useState(false)
  const [notes, setNotes] = useState('')

  const recent = [...health].sort((a, b) => (a.date < b.date ? 1 : -1))
  const conditions = uniqueRecent([...COMMON_CONDITIONS[category], ...recent.filter((h) => h.category === category).map((h) => h.condition)], 12)
  const treatments = uniqueRecent(recent.filter((h) => h.category === category).map((h) => h.treatment))
  const givers = uniqueRecent(recent.map((h) => h.givenBy))
  const wd = withdrawalDays === '' ? null : Math.max(0, Math.round(Number(withdrawalDays)))
  const withdrawalUntil = wd && date ? addDays(date, wd) : null
  const p = picker.profile

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const intent = intentOf(e)
    if (!p) return save.setError('Choose an animal from the herd list')
    const ok = await save.run(() =>
      addHealth({ data: { animalId: p.animal.id, date, category, condition, treatment, givenBy, withdrawalUntil, resolved, notes } }),
    )
    if (!ok) return
    onSaved(`${label(category)} record saved for ${p.animal.tag}`)
    if (intent === 'close') onClose()
    else picker.setText('') // keep category/condition/treatment for batch entry (e.g. herd vaccinations)
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <AnimalPicker picker={picker} autoFocus={!preset?.animalId} />
      <Field label="Category">
        <Segmented name="Category" value={category} onChange={setCategory} options={HEALTH_CATEGORIES.map((c) => ({ value: c, label: label(c) }))} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" htmlFor={`${base}-date`}>
          <input id={`${base}-date`} type="date" className="field" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Condition / reason" htmlFor={`${base}-cond`}>
          <input id={`${base}-cond`} className="field" list={`${base}-conds`} value={condition} onChange={(e) => setCondition(e.target.value)} required />
          <Suggestions id={`${base}-conds`} values={conditions} />
        </Field>
        <Field label="Treatment / product" htmlFor={`${base}-tx`} className="sm:col-span-2">
          <input id={`${base}-tx`} className="field" list={`${base}-txs`} value={treatment} onChange={(e) => setTreatment(e.target.value)} placeholder="Drug, dose, route" />
          <Suggestions id={`${base}-txs`} values={treatments} />
        </Field>
        <Field label="Given by" htmlFor={`${base}-by`}>
          <input id={`${base}-by`} className="field" list={`${base}-bys`} value={givenBy} onChange={(e) => setGivenBy(e.target.value)} />
          <Suggestions id={`${base}-bys`} values={givers} />
        </Field>
        <Field label="Withdrawal (days)" htmlFor={`${base}-wd`} hint={withdrawalUntil ? <>Withhold milk/meat until <strong>{formatDate(withdrawalUntil)}</strong></> : 'Leave empty if none'}>
          <input id={`${base}-wd`} type="number" min={0} max={365} inputMode="numeric" className="field" value={withdrawalDays} onChange={(e) => setWithdrawalDays(e.target.value)} />
        </Field>
      </div>
      <Field label="Notes" htmlFor={`${base}-notes`}>
        <textarea id={`${base}-notes`} className="field" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-pasture-600" checked={resolved} onChange={(e) => setResolved(e.target.checked)} />
        Already resolved (no follow-up needed)
      </label>
      <p className="text-xs text-muted">“Save &amp; add another” keeps the category and treatment, so you can log a batch vaccination cow by cow.</p>
      <Actions pending={save.pending} error={save.error} onClose={onClose} />
    </form>
  )
}

// ---------- animal ----------

function AnimalForm({ onSaved, onClose }: Omit<FormProps, 'preset'>) {
  const save = useSave()
  const base = useId()
  const [tag, setTag] = useState('')
  const [name, setName] = useState('')
  const [breed, setBreed] = useState('Holstein')
  const [birthDate, setBirthDate] = useState('')
  const [status, setStatus] = useState<(typeof ANIMAL_STATUSES)[number]>('heifer')
  const [lactation, setLactation] = useState('0')

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const intent = intentOf(e)
    const ok = await save.run(() =>
      saveAnimal({ data: { tag: tag.trim().toUpperCase(), name, breed, birthDate, status, lactation: Number(lactation) || 0 } }),
    )
    if (!ok) return
    onSaved(`${tag.toUpperCase()} added to the herd`)
    if (intent === 'close') onClose()
    else {
      setTag('')
      setName('')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ear tag" htmlFor={`${base}-tag`}>
          <input id={`${base}-tag`} className="field font-semibold uppercase" value={tag} onChange={(e) => setTag(e.target.value)} required autoFocus />
        </Field>
        <Field label="Name" htmlFor={`${base}-name`}>
          <input id={`${base}-name`} className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
        </Field>
        <Field label="Breed" htmlFor={`${base}-breed`}>
          <input id={`${base}-breed`} className="field" list={`${base}-breeds`} value={breed} onChange={(e) => setBreed(e.target.value)} />
          <Suggestions id={`${base}-breeds`} values={['Holstein', 'Friesian', 'Jersey', 'Ayrshire', 'Brown Swiss', 'Guernsey', 'Crossbred']} />
        </Field>
        <Field label="Date of birth" htmlFor={`${base}-dob`}>
          <input id={`${base}-dob`} type="date" className="field" value={birthDate} max={todayISO()} onChange={(e) => setBirthDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Status">
        <Segmented name="Status" value={status} onChange={setStatus} options={ANIMAL_STATUSES.map((s) => ({ value: s, label: label(s) }))} />
      </Field>
      <Field label="Lactation number" htmlFor={`${base}-lac`} className="sm:w-1/2">
        <input id={`${base}-lac`} type="number" min={0} max={20} className="field" value={lactation} onChange={(e) => setLactation(e.target.value)} />
      </Field>
      <Actions pending={save.pending} error={save.error} onClose={onClose} />
    </form>
  )
}
