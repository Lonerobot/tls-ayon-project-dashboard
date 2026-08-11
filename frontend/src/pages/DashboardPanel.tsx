import styled from "styled-components"

import { useDashboardData } from "../hooks/useDashboardData"
import DashboardHeader from "../components/DashboardHeader"
import ContentBlocks from "../components/ProjectDescription"
import ProjectSummaryInfo from "../components/ProjectSummaryInfo"
import KeyPersonnel from "../components/KeyPersonnel"
import LinkGrid from "../components/LinkGrid"

export interface DashboardPanelProps {
  projectName: string
}

const PanelWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--padding-m);
  padding: var(--padding-m);
  height: 100%;
  overflow-y: auto;
`

const BodyRow = styled.div`
  display: flex;
  gap: var(--padding-m);
  align-items: flex-start;
`

const StatusMessage = styled.p`
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--font-size-m);
  padding: var(--padding-m);
  text-align: center;
`

const DashboardPanel = ({ projectName }: DashboardPanelProps) => {
  const { data, isLoading, error } = useDashboardData(projectName)

  if (isLoading) return <StatusMessage>Loading…</StatusMessage>
  if (error) return <StatusMessage>Unable to load dashboard.</StatusMessage>
  if (!data || !data.enabled) return null

  const hasBlocks = data.content_blocks.some(
    (b) => b.title.trim() || b.content.trim()
  )
  const hasSummary = data.summary.some(
    (item) => item.name.trim() || item.content.trim()
  )
  const hasLinks = data.links.some((l) => l.enabled)
  const showBodyRow = hasBlocks || hasSummary

  return (
    <PanelWrapper>
      <DashboardHeader header={data.header} projectName={projectName} />

      {showBodyRow && (
        <BodyRow>
          {hasBlocks && (
            <ContentBlocks blocks={data.content_blocks} />
          )}
          {hasSummary && <ProjectSummaryInfo summary={data.summary} />}
        </BodyRow>
      )}

      <KeyPersonnel personnel={data.key_personnel} />

      {hasLinks && <LinkGrid links={data.links} />}
    </PanelWrapper>
  )
}

export default DashboardPanel
