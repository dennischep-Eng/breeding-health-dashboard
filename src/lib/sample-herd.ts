// Generates a realistic sample dairy herd relative to a given "today".
// Used once, on request, to populate an empty database for demonstration.
import { addDays, daysBetween, GESTATION_DAYS } from './herd'

type Row<T> = T & { tag: string }

export function buildSampleHerd(today: string) {
  let seed = 20261107
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]

  const names = ['Bluebell', 'Daisy', 'Clover', 'Buttercup', 'Maple', 'Hazel', 'Poppy', 'Willow', 'Juniper', 'Marigold', 'Rosie', 'Fern', 'Honey', 'Lark', 'Primrose', 'Sorrel', 'Tansy', 'Bramble', 'Heather', 'Meadow', 'Nutmeg', 'Saffron', 'Ivy', 'Pearl', 'Ginger', 'Thistle', 'Wren', 'Olive', 'Sage', 'Holly']
  const sires = ['Kingboy', 'Doorman', 'Renegade', 'Captain', 'Lambda', 'Moonboy', 'Brekem', 'Altaspring']
  const techs = ['J. Moreno', 'A. Kipkemboi', 'Farm staff']
  const vets = ['Dr. Patel', 'Dr. Ochieng', 'Herd manager']

  const animals: { tag: string; name: string; breed: string; birthDate: string; status: string; lactation: number }[] = []
  const breeding: Row<{ date: string; method: string; sire: string; technician: string; pregnancyResult: string; checkDate: string | null; notes: string }>[] = []
  const calving: Row<{ date: string; ease: number; calfSex: string; calfTag: string; calfWeightKg: number | null; outcome: string; notes: string }>[] = []
  const health: Row<{ date: string; category: string; condition: string; treatment: string; givenBy: string; withdrawalUntil: string | null; resolved: boolean; notes: string }>[] = []

  const service = (tag: string, date: string, result: string, method = 'ai') =>
    breeding.push({
      tag,
      date,
      method,
      sire: method === 'natural' ? 'Herd bull "Duke"' : pick(sires),
      technician: method === 'natural' ? '' : pick(techs),
      pregnancyResult: result,
      checkDate: result === 'pending' ? null : addDays(date, int(30, 40)),
      notes: '',
    })

  let calfNo = 400
  const cowCount = 24
  for (let i = 0; i < cowCount; i++) {
    const tag = `UK${(1100 + i * 7).toString()}`
    const lactation = int(1, 5)
    const lastCalving = addDays(today, -int(4, 340))
    const birthDate = addDays(lastCalving, -(730 + (lactation - 1) * 390 + int(0, 60)))
    let status = 'milking'

    // Conception that produced the last calving.
    service(tag, addDays(lastCalving, -GESTATION_DAYS + int(-3, 3)), 'pregnant')

    const ease = rand() < 0.75 ? 1 : rand() < 0.7 ? 2 : int(3, 4)
    const sex = rand() < 0.04 ? 'twins' : rand() < 0.5 ? 'heifer' : 'bull'
    const outcome = rand() < 0.05 ? 'stillborn' : 'alive'
    calving.push({
      tag,
      date: lastCalving,
      ease,
      calfSex: sex,
      calfTag: outcome === 'alive' ? `C${calfNo++}` : '',
      calfWeightKg: int(34, 46),
      outcome,
      notes: ease >= 3 ? 'Large calf, assisted delivery' : '',
    })
    if (lactation > 1 && rand() < 0.8) {
      const prev = addDays(lastCalving, -int(370, 420))
      calving.push({ tag, date: prev, ease: rand() < 0.8 ? 1 : 2, calfSex: rand() < 0.5 ? 'heifer' : 'bull', calfTag: `C${calfNo++ - 100}`, calfWeightKg: int(35, 45), outcome: 'alive', notes: '' })
    }

    // Services this lactation.
    const dim = daysBetween(lastCalving, today)
    let next = int(55, 75)
    let services = 0
    while (next < dim && services < 4) {
      const date = addDays(lastCalving, next)
      const age = daysBetween(date, today)
      if (age < 32) {
        service(tag, date, 'pending')
        break
      }
      const conceived = rand() < 0.45
      service(tag, date, conceived ? 'pregnant' : 'open', services >= 3 ? 'natural' : 'ai')
      services++
      if (conceived) {
        const due = addDays(date, GESTATION_DAYS)
        if (daysBetween(today, due) <= 55) status = 'dry'
        break
      }
      next += int(19, 26)
    }

    // Health history.
    if (dim < 20 && rand() < 0.5)
      health.push({ tag, date: addDays(lastCalving, int(1, 4)), category: 'metabolic', condition: rand() < 0.5 ? 'Milk fever' : 'Ketosis', treatment: 'Calcium borogluconate IV', givenBy: pick(vets), withdrawalUntil: null, resolved: dim > 8, notes: '' })
    if (rand() < 0.35) {
      const date = addDays(today, -int(1, 200))
      const recent = daysBetween(date, today) < 6
      health.push({ tag, date, category: 'mastitis', condition: `Clinical mastitis — ${pick(['LF', 'RF', 'LH', 'RH'])} quarter`, treatment: 'Intramammary cefalonium, 3 tubes', givenBy: pick(vets), withdrawalUntil: addDays(date, 7), resolved: !recent, notes: '' })
    }
    if (rand() < 0.25) {
      const date = addDays(today, -int(2, 150))
      health.push({ tag, date, category: 'lameness', condition: pick(['Sole ulcer — LH', 'Digital dermatitis', 'White line disease']), treatment: 'Hoof trim, block applied', givenBy: 'Hoof trimmer', withdrawalUntil: null, resolved: daysBetween(date, today) > 14, notes: '' })
    }
    if (rand() < 0.12) {
      const date = addDays(lastCalving, int(5, 12))
      health.push({ tag, date, category: 'reproductive', condition: 'Retained placenta / metritis', treatment: 'Oxytetracycline IM, 5 days', givenBy: pick(vets), withdrawalUntil: addDays(date, 12), resolved: daysBetween(date, today) > 12, notes: '' })
    }

    animals.push({ tag, name: names[i % names.length], breed: rand() < 0.8 ? 'Holstein' : pick(['Jersey', 'Ayrshire', 'Brown Swiss']), birthDate, status, lactation })
  }

  // Replacement heifers.
  for (let i = 0; i < 7; i++) {
    const tag = `UK${(1300 + i * 3).toString()}`
    const ageDays = int(380, 720)
    const birthDate = addDays(today, -ageDays)
    if (ageDays > 430) {
      const first = addDays(birthDate, int(420, 440))
      if (daysBetween(first, today) < 32) service(tag, first, 'pending')
      else service(tag, first, rand() < 0.6 ? 'pregnant' : 'open')
    }
    animals.push({ tag, name: names[(cowCount + i) % names.length], breed: 'Holstein', birthDate, status: 'heifer', lactation: 0 })
  }

  // Herd-wide vaccination.
  const vaxDate = addDays(today, -int(20, 60))
  for (const a of animals)
    health.push({ tag: a.tag, date: vaxDate, category: 'vaccination', condition: 'BVD / IBR booster', treatment: 'Bovilis IBR marker live', givenBy: 'Herd manager', withdrawalUntil: null, resolved: true, notes: '' })

  // A couple of animals that left the herd.
  animals.push({ tag: 'UK1015', name: 'Duchess', breed: 'Holstein', birthDate: addDays(today, -3200), status: 'culled', lactation: 6 })
  health.push({ tag: 'UK1015', date: addDays(today, -95), category: 'lameness', condition: 'Chronic lameness', treatment: 'Culled on welfare grounds', givenBy: 'Dr. Patel', withdrawalUntil: null, resolved: true, notes: '' })

  return { animals, breeding, calving, health }
}
