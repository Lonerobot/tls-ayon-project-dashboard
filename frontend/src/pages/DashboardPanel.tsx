import styled from "styled-components"

import { useDashboardData } from "../hooks/useDashboardData"
import DashboardHeader from "../components/DashboardHeader"
import ContentBlocks from "../components/ProjectDescription"
import ProjectSummaryInfo from "../components/ProjectSummaryInfo"
import KeyPersonnel from "../components/KeyPersonnel"
import LinkGrid from "../components/LinkGrid"
import ProjectRefs from "../components/ProjectRefs"

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
  flex-shrink: 0;
`

const MainColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--padding-m);
  flex: 1;
  min-width: 0;
`

const ProjectTitle = styled.h1`
  font-size: clamp(1.8rem, 3vw + 0.5rem, 3rem);
  font-weight: 700;
  margin: 0;
  color: var(--md-sys-color-primary);
  line-height: 1.15;
`

const ProjectSubtitle = styled.p`
  font-size: var(--font-size-l);
  margin: 0;
  color: var(--md-sys-color-on-surface-variant);
`

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
`

const StatusMessage = styled.p`
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--font-size-m);
  padding: var(--padding-m);
  text-align: center;
`

const DashboardPanel = ({ projectName }: DashboardPanelProps) => {
  const { data, isLoading, error, canManage } = useDashboardData(projectName)

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

  return (
    <PanelWrapper>
      <DashboardHeader header={data.header} projectName={projectName} canManage={canManage} />

      <TitleBlock>
        <ProjectTitle>{data.header.project_title || projectName}</ProjectTitle>
        {data.header.show_subtitle && data.header.subtitle && (
          <ProjectSubtitle>{data.header.subtitle}</ProjectSubtitle>
        )}
      </TitleBlock>

      <BodyRow>
        <MainColumn>
          {hasBlocks && <ContentBlocks blocks={data.content_blocks} />}
        </MainColumn>
        {hasSummary && <ProjectSummaryInfo summary={data.summary} />}
      </BodyRow>

      <KeyPersonnel personnel={data.key_personnel} />

      {data.refs_enabled && (
        <ProjectRefs
          projectName={projectName}
          thumbnailSize={data.refs_thumbnail_size ?? 140}
          canManage={canManage}
        />
      )}

      {hasLinks && <LinkGrid links={data.links} />}
    </PanelWrapper>
  )
}

export default DashboardPanel
