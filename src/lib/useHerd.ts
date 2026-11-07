import { useMemo } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { buildSummary, todayISO } from './herd'

const rootApi = getRouteApi('__root__')

export function useHerd() {
  return rootApi.useLoaderData()
}

export function useSummary() {
  const data = useHerd()
  return useMemo(() => buildSummary(data, todayISO()), [data])
}
