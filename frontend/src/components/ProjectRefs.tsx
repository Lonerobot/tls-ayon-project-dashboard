import { useRef, useState } from "react"
import styled from "styled-components"

import { getRefUrl } from "../api/dashboardApi"
import { useProjectRefs } from "../hooks/useProjectRefs"

const MAX_REFS = 6

interface ProjectRefsProps {
  projectName: string
  thumbnailSize: number
  canManage: boolean
}

const Strip = styled.div`
  display: flex;
  gap: var(--padding-s);
  flex-wrap: wrap;
`

const ThumbWrapper = styled.div<{ $size: number }>`
  position: relative;
  width: ${(p) => p.$size}px;
  height: ${(p) => p.$size}px;
  flex-shrink: 0;

  &:hover button {
    opacity: 1;
  }
`

const ThumbImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--border-radius);
  display: block;
  cursor: pointer;
  transition: opacity 0.12s ease;
  background-color: var(--md-sys-color-surface-container);

  &:hover {
    opacity: 0.85;
  }
`

const DeleteBtn = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  border: none;
  border-radius: var(--border-radius);
  padding: 2px 6px;
  font-size: var(--font-size-s);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.85);
  }
`

const AddTile = styled.div<{ $size: number }>`
  width: ${(p) => p.$size}px;
  height: ${(p) => p.$size}px;
  border-radius: var(--border-radius);
  border: 2px dashed var(--md-sys-color-outline-variant);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  color: var(--md-sys-color-on-surface-variant);
  font-family: "Material Symbols Outlined";
  font-size: 32px;
  transition: border-color 0.12s ease, color 0.12s ease;

  &:hover {
    border-color: var(--md-sys-color-primary);
    color: var(--md-sys-color-primary);
  }
`

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
`

const LightboxImg = styled.img`
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: var(--border-radius);
`

const ErrorText = styled.span`
  font-size: var(--font-size-s);
  color: var(--md-sys-color-error);
`

const ProjectRefs = ({ projectName, thumbnailSize, canManage }: ProjectRefsProps) => {
  const { refs, add, remove } = useProjectRefs(projectName)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  if (!refs.length && !canManage) return null

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    try {
      await add(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <>
      <Strip>
        {refs.map((filename) => (
          <ThumbWrapper key={filename} $size={thumbnailSize}>
            <ThumbImg
              src={getRefUrl(projectName, filename)}
              alt=""
              onClick={() => setLightbox(filename)}
            />
            {canManage && (
              <DeleteBtn
                onClick={() => remove(filename)}
                title="Remove reference"
              >
                ✕
              </DeleteBtn>
            )}
          </ThumbWrapper>
        ))}

        {canManage && refs.length < MAX_REFS && (
          <AddTile
            $size={thumbnailSize}
            title="Add reference image"
            onClick={() => fileInputRef.current?.click()}
          >
            add_photo_alternate
          </AddTile>
        )}
      </Strip>

      {error && <ErrorText>{error}</ErrorText>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        title="Upload reference image"
        style={{ display: "none" }}
        onChange={handleFile}
      />

      {lightbox && (
        <Backdrop
          ref={backdropRef}
          onClick={(e) => e.target === backdropRef.current && setLightbox(null)}
        >
          <LightboxImg src={getRefUrl(projectName, lightbox)} alt="" />
        </Backdrop>
      )}
    </>
  )
}

export default ProjectRefs
