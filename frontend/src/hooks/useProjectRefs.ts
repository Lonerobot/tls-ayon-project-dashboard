import { useState, useEffect, useCallback } from "react"
import { fetchRefs, uploadRef, deleteRef } from "../api/dashboardApi"

export interface UseProjectRefsResult {
  refs: string[]
  isLoading: boolean
  add: (file: File) => Promise<void>
  remove: (filename: string) => Promise<void>
}

export function useProjectRefs(projectName: string): UseProjectRefsResult {
  const [refs, setRefs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(() => {
    if (!projectName) return
    setIsLoading(true)
    fetchRefs(projectName)
      .then(setRefs)
      .catch(() => setRefs([]))
      .finally(() => setIsLoading(false))
  }, [projectName])

  useEffect(() => { load() }, [load])

  const add = useCallback(async (file: File) => {
    await uploadRef(projectName, file)
    load()
  }, [projectName, load])

  const remove = useCallback(async (filename: string) => {
    await deleteRef(projectName, filename)
    setRefs((prev) => prev.filter((r) => r !== filename))
  }, [projectName])

  return { refs, isLoading, add, remove }
}
