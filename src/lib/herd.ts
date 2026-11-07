// Shared (client + server safe) types, labels and herd calculations.
import type {
  animals,
  breedingEvents,
  calvingEvents,
  healthEvents,
} from '../../db/schema'

export type Animal = typeof animals.$inferSelect
export type BreedingEvent = typeof breedingEvents.$inferSelect
export type CalvingEvent = typeof calvingEvents.$inferSelect
export type HealthEvent = typeof healthEvents.$inferSelect

export type HerdData = {
  animals: Animal[]
  breeding: BreedingEvent[]
  calving: CalvingEvent[]
  health: HealthEvent[]
}

export const GESTATION_DAYS = 283
export const VOLUNTARY_WAITING_DAYS = 50
export const PREG_CHECK_FROM_DAYS = 28
export const PREG_CHECK_TO_DAYS = 45
export const DRY_OFF_BEFORE_DUE_DAYS = 60

export const ANIMAL_STATUSES = ['milking', 'dry', 'heifer', 'sold', 'culled'] as const
export const BREEDING_METHODS = ['ai', 'natural', 'embryo'] as const
export const PREG_RESULTS = ['pending', 'pregnant', 'open'] as const
export const CALF_SEXES = ['heifer', 'bull', 'twins'] as const
export const CALF_OUTCOMES = ['alive', 'stillborn'] as const
export const HEALTH_CATEGORIES = [
  'mastitis',
  'lameness',
  'metabolic',
  'reproductive',
  'respiratory',
  'digestive',
  'vaccination',
  'other',
] as const

export const LABELS: Record<string, string> = {
  milking: 'Milking',
  dry: 'Dry',
  heifer: 'Heifer',
  sold: 'Sold',
  culled: 'Culled',
  ai: 'AI',
  natural: 'Natural service',
  embryo: 'Embryo transfer',
  pending: 'Awaiting check',
  pregnant: 'Pregnant',
  open: 'Open',
  bull: 'Bull calf',
  twins: 'Twins',
  alive: 'Alive',
  stillborn: 'Stillborn',
  mastitis: 'Mastitis',
  lameness: 'Lameness',
  metabolic: 'Metabolic',
  reproductive: 'Reproductive',
  respiratory: 'Respiratory',
  digestive: 'Digestive',
  vaccination: 'Vaccination',
  other: 'Other',
}

export const CALVING_EASE: Record<number, string> = {
  1: 'Unassisted',
  2: 'Easy pull',
  3: 'Hard pull',
  4: 'Vet assisted',
  5: 'Caesarean',
}

export const label = (value: string) => LABELS[value] ?? value

// ---------- date helpers (all dates are YYYY-MM-DD strings, treated as UTC) ----------

const DAY = 86_400_000

export function todayISO(): string {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return new Date(d.getTime() + days * DAY).toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  return Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() -
      new Date(`${from}T00:00:00Z`).getTime()) /
      DAY,
  )
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatShortDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

export function relativeDays(days: number): string {
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  return days > 0 ? `in ${days} days` : `${-days} days ago`
}

const byDateDesc = <T extends { date: string; id: number }>(a: T, b: T) =>
  a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1

// ---------- per-animal reproductive profile ----------

export type ReproStatus = 'pregnant' | 'bred' | 'open' | 'fresh' | 'unbred heifer' | 'inactive'

export type AnimalProfile = {
  animal: Animal
  lastCalving: CalvingEvent | null
  lastBreeding: BreedingEvent | null
  servicesThisLactation: number
  daysInMilk: number | null
  reproStatus: ReproStatus
  dueDate: string | null
  activeHealth: HealthEvent[]
  withdrawalUntil: string | null
}

export function buildProfiles(data: HerdData, today = todayISO()): AnimalProfile[] {
  const calvingByAnimal = groupBy(data.calving, (c) => c.animalId)
  const breedingByAnimal = groupBy(data.breeding, (b) => b.animalId)
  const healthByAnimal = groupBy(data.health, (h) => h.animalId)

  return data.animals.map((animal) => {
    const calvings = (calvingByAnimal.get(animal.id) ?? []).sort(byDateDesc)
    const lastCalving = calvings[0] ?? null
    const breedings = (breedingByAnimal.get(animal.id) ?? [])
      .filter((b) => !lastCalving || b.date > lastCalving.date)
      .sort(byDateDesc)
    const lastBreeding = breedings[0] ?? null
    const health = healthByAnimal.get(animal.id) ?? []
    const activeHealth = health.filter((h) => !h.resolved)
    const withdrawalUntil =
      health
        .map((h) => h.withdrawalUntil)
        .filter((d): d is string => !!d && d >= today)
        .sort()
        .at(-1) ?? null

    const inactive = animal.status === 'sold' || animal.status === 'culled'
    let reproStatus: ReproStatus
    let dueDate: string | null = null
    if (inactive) reproStatus = 'inactive'
    else if (lastBreeding?.pregnancyResult === 'pregnant') {
      reproStatus = 'pregnant'
      dueDate = addDays(lastBreeding.date, GESTATION_DAYS)
    } else if (lastBreeding?.pregnancyResult === 'pending') reproStatus = 'bred'
    else if (!lastCalving) reproStatus = lastBreeding ? 'open' : 'unbred heifer'
    else if (!lastBreeding && daysBetween(lastCalving.date, today) < VOLUNTARY_WAITING_DAYS)
      reproStatus = 'fresh'
    else reproStatus = 'open'

    const daysInMilk =
      lastCalving && animal.status === 'milking'
        ? daysBetween(lastCalving.date, today)
        : null

    return {
      animal,
      lastCalving,
      lastBreeding,
      servicesThisLactation: breedings.length,
      daysInMilk,
      reproStatus,
      dueDate,
      activeHealth,
      withdrawalUntil,
    }
  })
}

// ---------- dashboard summary ----------

export type ActionItem = {
  key: string
  animalId: number
  tag: string
  kind: 'calving' | 'dry-off' | 'preg-check' | 'breed' | 'withdrawal' | 'health'
  title: string
  detail: string
  date: string
  days: number
}

export function buildSummary(data: HerdData, today = todayISO()) {
  const profiles = buildProfiles(data, today)
  const active = profiles.filter((p) => p.reproStatus !== 'inactive')
  const eligible = active.filter((p) => p.reproStatus !== 'fresh' && p.reproStatus !== 'unbred heifer')
  const pregnant = active.filter((p) => p.reproStatus === 'pregnant')

  const yearAgo = addDays(today, -365)
  const checked = data.breeding.filter(
    (b) => b.date >= yearAgo && b.pregnancyResult !== 'pending',
  )
  const conceived = checked.filter((b) => b.pregnancyResult === 'pregnant')
  const recentCalvings = data.calving.filter((c) => c.date >= yearAgo)
  const easeAvg = recentCalvings.length
    ? recentCalvings.reduce((s, c) => s + c.ease, 0) / recentCalvings.length
    : null
  const assisted = recentCalvings.filter((c) => c.ease >= 3).length

  const actions: ActionItem[] = []
  for (const p of active) {
    const tag = p.animal.tag
    if (p.dueDate) {
      const days = daysBetween(today, p.dueDate)
      if (days <= 30)
        actions.push({ key: `due-${p.animal.id}`, animalId: p.animal.id, tag, kind: 'calving', title: 'Due to calve', detail: `Bred ${formatShortDate(p.lastBreeding!.date)} to ${p.lastBreeding!.sire || 'unknown sire'}`, date: p.dueDate, days })
      const dryOff = addDays(p.dueDate, -DRY_OFF_BEFORE_DUE_DAYS)
      const dryDays = daysBetween(today, dryOff)
      if (p.animal.status === 'milking' && dryDays <= 14)
        actions.push({ key: `dry-${p.animal.id}`, animalId: p.animal.id, tag, kind: 'dry-off', title: 'Dry off', detail: `${DRY_OFF_BEFORE_DUE_DAYS} days before due ${formatShortDate(p.dueDate)}`, date: dryOff, days: dryDays })
    }
    if (p.reproStatus === 'bred' && p.lastBreeding) {
      const since = daysBetween(p.lastBreeding.date, today)
      if (since >= PREG_CHECK_FROM_DAYS - 3) {
        const date = addDays(p.lastBreeding.date, PREG_CHECK_FROM_DAYS)
        actions.push({ key: `pc-${p.animal.id}`, animalId: p.animal.id, tag, kind: 'preg-check', title: 'Pregnancy check', detail: `${since} days since service${since > PREG_CHECK_TO_DAYS ? ' — overdue' : ''}`, date, days: daysBetween(today, date) })
      }
    }
    if (p.reproStatus === 'open' && p.lastCalving) {
      const dim = daysBetween(p.lastCalving.date, today)
      if (dim >= VOLUNTARY_WAITING_DAYS)
        actions.push({ key: `br-${p.animal.id}`, animalId: p.animal.id, tag, kind: 'breed', title: 'Open — ready to breed', detail: `${dim} days since calving, ${p.servicesThisLactation} service${p.servicesThisLactation === 1 ? '' : 's'}`, date: addDays(p.lastCalving.date, VOLUNTARY_WAITING_DAYS), days: VOLUNTARY_WAITING_DAYS - dim })
    }
    if (p.withdrawalUntil) {
      actions.push({ key: `wd-${p.animal.id}`, animalId: p.animal.id, tag, kind: 'withdrawal', title: 'Milk/meat withdrawal', detail: `Withhold until ${formatShortDate(p.withdrawalUntil)} inclusive`, date: p.withdrawalUntil, days: daysBetween(today, p.withdrawalUntil) })
    }
    for (const h of p.activeHealth) {
      actions.push({ key: `h-${h.id}`, animalId: p.animal.id, tag, kind: 'health', title: h.condition, detail: h.treatment ? `Treatment: ${h.treatment}` : label(h.category), date: h.date, days: daysBetween(today, h.date) })
    }
  }
  actions.sort((a, b) => a.days - b.days)

  // Calvings per month: 12 months back actual, 6 months forward expected.
  const months: { key: string; label: string; actual: number; expected: number; future: boolean }[] = []
  const t = new Date(`${today}T00:00:00Z`)
  for (let i = -11; i <= 6; i++) {
    const d = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + i, 1))
    months.push({
      key: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      actual: 0,
      expected: 0,
      future: i > 0,
    })
  }
  const monthIndex = new Map(months.map((m, i) => [m.key, i]))
  for (const c of data.calving) {
    const i = monthIndex.get(c.date.slice(0, 7))
    if (i !== undefined) months[i].actual++
  }
  for (const p of pregnant) {
    const i = monthIndex.get(p.dueDate!.slice(0, 7))
    if (i !== undefined && p.dueDate! >= today) months[i].expected++
  }

  // Services by month (last 12) with outcomes.
  const services = months.slice(0, 12).map((m) => ({ key: m.key, label: m.label, pregnant: 0, open: 0, pending: 0 }))
  const serviceIndex = new Map(services.map((m, i) => [m.key, i]))
  for (const b of data.breeding) {
    const i = serviceIndex.get(b.date.slice(0, 7))
    if (i !== undefined) services[i][b.pregnancyResult as 'pregnant' | 'open' | 'pending']++
  }

  const healthByCategory = HEALTH_CATEGORIES.map((category) => ({
    category,
    label: label(category),
    count: data.health.filter((h) => h.category === category && h.date >= yearAgo).length,
  })).filter((c) => c.count > 0)
  healthByCategory.sort((a, b) => b.count - a.count)

  return {
    profiles,
    actions,
    months,
    services,
    healthByCategory,
    kpis: {
      herdSize: active.length,
      milking: active.filter((p) => p.animal.status === 'milking').length,
      pregnantShare: eligible.length ? pregnant.length / eligible.length : null,
      pregnant: pregnant.length,
      eligible: eligible.length,
      conceptionRate: checked.length ? conceived.length / checked.length : null,
      servicesChecked: checked.length,
      dueNext30: pregnant.filter((p) => {
        const d = daysBetween(today, p.dueDate!)
        return d >= -7 && d <= 30
      }).length,
      calvingsYear: recentCalvings.length,
      easeAvg,
      assisted,
      activeCases: active.reduce((s, p) => s + p.activeHealth.length, 0),
      inWithdrawal: active.filter((p) => p.withdrawalUntil).length,
    },
  }
}

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const item of items) {
    const k = key(item)
    const list = map.get(k)
    if (list) list.push(item)
    else map.set(k, [item])
  }
  return map
}

export const percent = (v: number | null) =>
  v === null ? '—' : `${Math.round(v * 100)}%`
