import styled from "styled-components"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import type { ContentBlock } from "../models/dashboard"

interface ContentBlocksProps {
  blocks: ContentBlock[]
}

const Wrapper = styled.section`
  flex: 3;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--padding-m);
`

const Card = styled.div`
  background-color: var(--md-sys-color-surface-container-low);
  border-radius: var(--border-radius);
  padding: var(--padding-m);
`

const BlockTitle = styled.h1`
  font-size: var(--font-size-l);
  font-weight: 600;
  margin: 0 0 var(--padding-m);
  /* color: red; */
  /* color: var(--md-sys-color-on-surface); */
  color: var(--md-sys-color-primary);

  line-height: 1.2;
`

const MarkdownBody = styled.div`
  color: var(--md-sys-color-on-surface);
  font-size: var(--font-size-m);
  line-height: 1.65;

  h1,
  h2,
  h3,
  h4 {
    margin: 1em 0 0.4em;
    color: var(--md-sys-color-on-surface);
    line-height: 1.2;
    font-weight: 600;

    &:first-child {
      margin-top: 0;
    }
  }

  p {
    margin: 0 0 0.75em;

    &:last-child {
      margin-bottom: 0;
    }
  }

  ul,
  ol {
    padding-left: 1.5em;
    margin: 0 0 0.75em;
  }

  li {
    margin-bottom: 0.25em;
  }

  a {
    color: var(--md-sys-color-primary);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  code {
    background: var(--md-sys-color-surface-container);
    border-radius: 3px;
    padding: 0.1em 0.4em;
    font-family: monospace;
    font-size: 0.9em;
  }

  pre {
    background: var(--md-sys-color-surface-container);
    border-radius: var(--border-radius);
    padding: var(--padding-m);
    overflow-x: auto;
    margin: 0 0 0.75em;

    code {
      background: transparent;
      padding: 0;
    }
  }

  blockquote {
    border-left: 3px solid var(--md-sys-color-primary);
    margin: 0 0 0.75em;
    padding-left: var(--padding-m);
    color: var(--md-sys-color-on-surface-variant);
    font-style: italic;
  }

  hr {
    border: none;
    border-top: 1px solid var(--md-sys-color-outline-variant);
    margin: var(--padding-m) 0;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 0.75em;
    font-size: var(--font-size-s);
  }

  th,
  td {
    border: 1px solid var(--md-sys-color-outline-variant);
    padding: var(--padding-s) var(--padding-m);
    text-align: left;
  }

  th {
    background: var(--md-sys-color-surface-container);
    font-weight: 600;
  }
`

const ContentBlocks = ({ blocks }: ContentBlocksProps) => {
  const visible = blocks.filter((b) => b.title.trim() || b.content.trim())
  if (!visible.length) return null

  return (
    <Wrapper>
      {visible.map((block, idx) => (
        <Card key={idx}>
          {block.title.trim() && <BlockTitle>{block.title}</BlockTitle>}
          {block.content.trim() && (
            <MarkdownBody>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {block.content}
              </ReactMarkdown>
            </MarkdownBody>
          )}
        </Card>
      ))}
    </Wrapper>
  )
}

export default ContentBlocks
