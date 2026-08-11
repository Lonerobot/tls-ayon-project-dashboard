import styled from "styled-components"
import { Icon } from "@ynput/ayon-react-components"

import type { LinkItem } from "../models/dashboard"

interface LinkTileProps {
  link: LinkItem
}

/** Ensure a URL has an explicit scheme so the browser treats it as absolute. */
function normalizeUrl(url: string): string {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

const TileAnchor = styled.a`
  display: flex;
  align-items: center;
  gap: var(--padding-m);
  padding: var(--padding-m) var(--padding-l);
  background-color: var(--md-sys-color-surface-container);
  border-radius: var(--border-radius);
  text-decoration: none;
  color: var(--md-sys-color-on-surface);
  cursor: pointer;
  min-width: 0;
  transition: background-color 0.12s ease, transform 0.1s ease;

  .icon {
    font-size: 24px;
  }

  &:hover {
    background-color: var(--md-sys-color-surface-container-high);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
`

const TileLabel = styled.span`
  font-size: var(--font-size-l);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const LinkTile = ({ link }: LinkTileProps) => {
  if (!link.enabled) return null

  return (
    <TileAnchor
      href={normalizeUrl(link.url)}
      target={link.open_external ? "_blank" : "_self"}
      rel={link.open_external ? "noopener noreferrer" : undefined}
      title={link.title}
    >
      {link.icon && <Icon icon={link.icon} />}
      <TileLabel>{link.title}</TileLabel>
    </TileAnchor>
  )
}

export default LinkTile
