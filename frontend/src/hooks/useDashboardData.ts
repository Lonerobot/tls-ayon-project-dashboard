import { useState, useEffect, useCallback } from "react"

import type { DashboardData } from "../models/dashboard"
import { fetchDashboardData } from "../api/dashboardApi"
import { mockDashboardData } from "../dev/mockData"

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === "true"

export interface UseDashboardDataResult {
  data: DashboardData | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Fetch and cache the dashboard configuration for the given project.
 *
 * Set VITE_USE_MOCK_DATA=true in .env.local to bypass the API during
 * frontend-only development.
 */
export function useDashboardData(projectName: string): UseDashboardDataResult {
  const [data, setData] = useState<DashboardData | null>(
    USE_MOCK ? mockDashboardData : null
  )
  const [isLoading, setIsLoading] = useState(!USE_MOCK)
  const [error, setError] = useState<string | null>(null)
  const [fetchTick, setFetchTick] = useState(0)

  const refetch = useCallback(() => setFetchTick((t) => t + 1), [])

  useEffect(() => {
    if (USE_MOCK || !projectName) return

    let cancelled = false
    setIsLoading(true)
    setError(null)

    fetchDashboardData(projectName)
      .then((result) => {
        if (!cancelled) {
          setData(result)
          setIsLoading(false)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message)
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [projectName, fetchTick])

  return { data, isLoading, error, refetch }
}
