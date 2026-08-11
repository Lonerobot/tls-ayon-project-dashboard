import { useEffect, useRef, useState } from "react"
import styled from "styled-components"

import type { PersonItem } from "../models/dashboard"
import { fetchUser, getUserAvatarUrl } from "../api/dashboardApi"

interface KeyPersonnelProps {
  personnel: PersonItem[]
}

interface ResolvedPerson {
  username: string
  displayName: string
  role: string
  avatarUrl: string
}

const Card = styled.section`
  background-color: var(--md-sys-color-surface-container-low);
  border-radius: var(--border-radius);
  padding: var(--padding-m);
`

const CardTitle = styled.h2`
  font-size: var(--font-size-s);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--md-sys-color-on-surface-variant);
  margin: 0 0 var(--padding-m);
`

const PersonGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--padding-s);
`

const PersonTile = styled.div`
  display: flex;
  align-items: center;
  gap: var(--padding-s);
  background-color: var(--md-sys-color-surface-container);
  border-radius: var(--border-radius);
  padding: var(--padding-s) var(--padding-m);
  cursor: pointer;
  transition: background-color 0.12s ease;

  &:hover {
    background-color: var(--md-sys-color-surface-container-high);
  }
`

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
`

const PopupCard = styled.div`
  background-color: var(--md-sys-color-surface-container-low);
  border-radius: var(--border-radius);
  padding: var(--padding-l);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--padding-m);
  width: 320px;
`

const PopupAvatar = styled.img`
  width: 180px;
  height: 180px;
  border-radius: 50%;
  object-fit: cover;
`

const PopupFallback = styled.span`
  font-family: "Material Symbols Outlined";
  font-size: 180px;
  line-height: 1;
  color: var(--md-sys-color-on-surface-variant);
  user-select: none;
`

const PopupName = styled.span`
  font-size: var(--font-size-l);
  font-weight: 700;
  color: var(--md-sys-color-on-surface);
  text-align: center;
`

const PopupRole = styled.span`
  font-size: var(--font-size-m);
  color: var(--md-sys-color-on-surface-variant);
  text-align: center;
`

const Avatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`

const FallbackIcon = styled.span`
  font-family: "Material Symbols Outlined";
  font-size: 32px;
  color: var(--md-sys-color-on-surface-variant);
  user-select: none;
  flex-shrink: 0;
`

const PersonLabel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`

const PersonName = styled.span`
  font-size: var(--font-size-m);
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
`

const PersonRole = styled.span`
  font-size: var(--font-size-s);
  color: var(--md-sys-color-on-surface-variant);
`

interface PersonAvatarProps {
  username: string
  displayName: string
}

const PersonAvatar = ({ username, displayName }: PersonAvatarProps) => {
  const [broken, setBroken] = useState(false)

  if (broken) return <FallbackIcon>account_circle</FallbackIcon>

  return (
    <Avatar
      src={getUserAvatarUrl(username)}
      alt={displayName}
      onError={() => setBroken(true)}
    />
  )
}

const PopupAvatarImage = ({ username, displayName }: PersonAvatarProps) => {
  const [broken, setBroken] = useState(false)

  if (broken) return <PopupFallback>account_circle</PopupFallback>

  return (
    <PopupAvatar
      src={getUserAvatarUrl(username)}
      alt={displayName}
      onError={() => setBroken(true)}
    />
  )
}

const KeyPersonnel = ({ personnel }: KeyPersonnelProps) => {
  const [resolved, setResolved] = useState<ResolvedPerson[]>([])
  const [selected, setSelected] = useState<ResolvedPerson | null>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  const visible = personnel.filter((p) => p.enabled && p.username.trim())
  const usernameKey = visible.map((p) => p.username).join(",")

  useEffect(() => {
    if (!visible.length) {
      setResolved([])
      return
    }

    Promise.all(
      visible.map(async (person) => {
        try {
          const user = await fetchUser(person.username)
          return {
            username: person.username,
            displayName: user.attrib?.fullName || person.username,
            role: person.role,
            avatarUrl: getUserAvatarUrl(person.username),
          }
        } catch {
          return {
            username: person.username,
            displayName: person.username,
            role: person.role,
            avatarUrl: getUserAvatarUrl(person.username),
          }
        }
      })
    ).then(setResolved)
  }, [usernameKey])

  if (!visible.length) return null

  const items = resolved.length ? resolved : visible.map((p) => ({
    username: p.username,
    displayName: p.username,
    role: p.role,
    avatarUrl: getUserAvatarUrl(p.username),
  }))

  return (
    <Card>
      <CardTitle>Key Personnel</CardTitle>
      <PersonGrid>
        {items.map((person) => (
          <PersonTile key={person.username} onClick={() => setSelected(person)}>
            <PersonAvatar
              username={person.username}
              displayName={person.displayName}
            />
            <PersonLabel>
              <PersonName>{person.displayName}</PersonName>
              {person.role.trim() && <PersonRole>{person.role}</PersonRole>}
            </PersonLabel>
          </PersonTile>
        ))}
      </PersonGrid>

      {selected && (
        <Backdrop ref={backdropRef} onClick={(e) => e.target === backdropRef.current && setSelected(null)}>
          <PopupCard>
            <PopupAvatarImage username={selected.username} displayName={selected.displayName} />
            <PopupName>{selected.displayName}</PopupName>
            {selected.role.trim() && <PopupRole>{selected.role}</PopupRole>}
          </PopupCard>
        </Backdrop>
      )}
    </Card>
  )
}

export default KeyPersonnel
