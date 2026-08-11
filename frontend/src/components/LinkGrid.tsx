import styled from "styled-components"

import type { LinkItem } from "../models/dashboard"
import LinkTile from "./LinkTile"

interface LinkGridProps {
  links: LinkItem[]
}

const Card = styled.section`
  background-color: var(--md-sys-color-surface-container-low);
  border-radius: var(--border-radius);
  padding: var(--padding-m);
`

const SectionTitle = styled.h2`
  font-size: var(--font-size-l);
  font-weight: 600;
  margin: 0 0 var(--padding-m);
  color: var(--md-sys-color-on-surface);
  line-height: 1.2;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--padding-s);
`

const LinkGrid = ({ links }: LinkGridProps) => {
  const activeLinks = links.filter((l) => l.enabled)
  if (!activeLinks.length) return null

  return (
    <Card>
      <SectionTitle>Useful Links</SectionTitle>
      <Grid>
        {activeLinks.map((link, idx) => (
          <LinkTile key={`${link.url}-${idx}`} link={link} />
        ))}
      </Grid>
    </Card>
  )
}

export default LinkGrid
