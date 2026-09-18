import React from "react"
import styled from "styled-components"

import type { SummaryItem } from "../models/dashboard"

interface ProjectSummaryInfoProps {
  summary: SummaryItem[]
}

const Callout = styled.aside`
  flex: 0 0 200px;
  width: 200px;
  background-color: var(--md-sys-color-surface-container-low);
  border-radius: var(--border-radius);
  padding: var(--padding-m);
  display: flex;
  flex-direction: column;
  gap: var(--padding-s);
  align-self: flex-start;
`

const CalloutTitle = styled.h3`
  font-size: var(--font-size-s);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--md-sys-color-on-surface-variant);
  margin: 0 0 var(--padding-s);
`

const Divider = styled.hr`
  border: none;
  border-top: 1px solid var(--md-sys-color-outline-variant);
  margin: 0;
`

const EntryWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const EntryLabel = styled.span`
  font-size: var(--font-size-xs);
  color: var(--md-sys-color-on-surface-variant);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const EntryValue = styled.span`
  font-size: var(--font-size-m);
  color: var(--md-sys-color-on-surface);
  font-weight: 500;
`

interface SummaryEntry {
  label: string
  value: string
}

const ProjectSummaryInfo = ({ summary }: ProjectSummaryInfoProps) => {
  const entries: SummaryEntry[] = summary
    .filter((item) => item.name.trim() || item.content.trim())
    .map((item) => ({ label: item.name, value: item.content }))

  if (!entries.length) return null

  return (
    <Callout>
      <CalloutTitle>Project Info</CalloutTitle>
      {entries.map((entry, idx) => (
        <React.Fragment key={entry.label}>
          {idx > 0 && <Divider />}
          <EntryWrapper>
            <EntryLabel>{entry.label}</EntryLabel>
            <EntryValue>{entry.value}</EntryValue>
          </EntryWrapper>
        </React.Fragment>
      ))}
    </Callout>
  )
}

export default ProjectSummaryInfo
