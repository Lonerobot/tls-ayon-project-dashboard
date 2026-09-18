import addonVersion from "../addonVersion"
import type { DashboardData } from "../models/dashboard"

const ADDON_NAME = "project-dashboard"
const BASE = `/api/addons/${ADDON_NAME}/${addonVersion}/dashboard`
const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === "true"

export interface AyonUser {
  name: string
  attrib: {
    fullName?: string
  }
}

export interface CurrentUserInfo {
  name: string
  data?: {
    isAdmin?: boolean
    isManager?: boolean
  }
}

const MOCK_USERS: Record<string, AyonUser> = {
  "jane.doe": { name: "jane.doe", attrib: { fullName: "Jane Doe" } },
  "john.smith": { name: "john.smith", attrib: { fullName: "John Smith" } },
  "alex.chen": { name: "alex.chen", attrib: { fullName: "Alex Chen" } },
}

/**
 * Fetch an AYON user's profile. Used to resolve display names for Key Personnel.
 */
export async function fetchUser(username: string): Promise<AyonUser> {
  if (USE_MOCK) {
    return MOCK_USERS[username] ?? { name: username, attrib: {} }
  }
  const response = await fetch(
    `/api/users/${encodeURIComponent(username)}`,
    { credentials: "include" }
  )
  if (!response.ok) {
    throw new Error(`Failed to fetch user ${username} (${response.status})`)
  }
  return response.json() as Promise<AyonUser>
}

/**
 * Returns the URL for an AYON user's avatar image.
 * AYON serves a generated placeholder when no custom avatar is set.
 */
export function getUserAvatarUrl(username: string): string {
  return `/api/users/${encodeURIComponent(username)}/avatar`
}

/**
 * Fetch the resolved dashboard configuration for a project.
 * Throws on non-2xx responses.
 */
export async function fetchDashboardData(
  projectName: string
): Promise<DashboardData> {
  const response = await fetch(`${BASE}/${encodeURIComponent(projectName)}`, {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error(
      `Failed to load dashboard data (${response.status} ${response.statusText})`
    )
  }

  return response.json() as Promise<DashboardData>
}

/**
 * Return the URL that streams the project banner image.
 * Only valid when the backend has confirmed has_banner === true.
 * In mock mode, returns the static dev-banner.jpg from frontend/public/.
 */
export function getBannerUrl(projectName: string): string {
  if (USE_MOCK) return "/dev-banner.jpg"
  return `${BASE}/${encodeURIComponent(projectName)}/banner`
}

/**
 * Upload a new banner image for a project.
 * Accepts any image/* file up to 5 MB.
 */
export async function uploadBanner(
  projectName: string,
  file: File
): Promise<void> {
  if (USE_MOCK) return // no-op in mock mode

  const body = new FormData()
  body.append("file", file)

  const response = await fetch(
    `${BASE}/${encodeURIComponent(projectName)}/banner`,
    { method: "POST", body, credentials: "include" }
  )

  if (!response.ok) {
    throw new Error(
      `Banner upload failed (${response.status} ${response.statusText})`
    )
  }
}

/**
 * Delete the stored banner image for a project.
 */
export async function removeBanner(projectName: string): Promise<void> {
  if (USE_MOCK) return // no-op in mock mode

  const response = await fetch(
    `${BASE}/${encodeURIComponent(projectName)}/banner`,
    { method: "DELETE", credentials: "include" }
  )

  if (!response.ok) {
    throw new Error(
      `Banner removal failed (${response.status} ${response.statusText})`
    )
  }
}

export async function fetchCurrentUser(): Promise<CurrentUserInfo> {
  // In mock mode assume full management rights so the dev experience is unchanged.
  if (USE_MOCK) return { name: "dev", data: { isAdmin: true } }

  const response = await fetch("/api/users/me", { credentials: "include" })
  if (!response.ok) {
    throw new Error(`Failed to fetch current user (${response.status})`)
  }
  const data = await response.json()
  return data as CurrentUserInfo
}

export function getRefUrl(projectName: string, filename: string): string {
  return `${BASE}/${encodeURIComponent(projectName)}/refs/${encodeURIComponent(filename)}`
}

export async function fetchRefs(projectName: string): Promise<string[]> {
  if (USE_MOCK) return []
  const res = await fetch(`${BASE}/${encodeURIComponent(projectName)}/refs`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error(`Failed to fetch refs (${res.status})`)
  return res.json() as Promise<string[]>
}

export async function uploadRef(projectName: string, file: File): Promise<void> {
  if (USE_MOCK) return
  const body = new FormData()
  body.append("file", file)
  const res = await fetch(`${BASE}/${encodeURIComponent(projectName)}/refs`, {
    method: "POST",
    body,
    credentials: "include",
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText)
    throw new Error(detail || `Upload failed (${res.status})`)
  }
}

export async function deleteRef(projectName: string, filename: string): Promise<void> {
  if (USE_MOCK) return
  const res = await fetch(
    `${BASE}/${encodeURIComponent(projectName)}/refs/${encodeURIComponent(filename)}`,
    { method: "DELETE", credentials: "include" }
  )
  if (!res.ok) throw new Error(`Delete failed (${res.status})`)
}
