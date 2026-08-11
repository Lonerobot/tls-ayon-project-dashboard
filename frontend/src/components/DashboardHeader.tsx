import { useRef, useState } from "react"
import styled from "styled-components"

import type { HeaderSettings } from "../models/dashboard"
import { getBannerUrl, uploadBanner, removeBanner } from "../api/dashboardApi"

interface DashboardHeaderProps {
  header: HeaderSettings
  projectName: string
}

const HeaderWrapper = styled.header`
  border-radius: var(--border-radius);
  overflow: hidden;
  background-color: var(--md-sys-color-surface-container-low);
`

const BannerArea = styled.div`
  position: relative;

  &:hover .banner-btns {
    opacity: 1;
  }
`

const BannerImage = styled.img`
  display: block;
  width: 100%;
  height: 200px;
  object-fit: cover;
`

const BannerPlaceholder = styled.div`
  width: 100%;
  height: 160px;
  background-color: var(--md-sys-color-surface-container);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--font-size-s);
`

const ButtonRow = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.15s ease;
`

const UploadBtn = styled.button`
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border: none;
  border-radius: var(--border-radius);
  padding: 4px 10px;
  font-size: var(--font-size-s);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }

  &:disabled {
    opacity: 0.5 !important;
    cursor: not-allowed;
  }
`

const HeaderContent = styled.div`
  padding: var(--padding-m);
`

const ProjectTitle = styled.h1`
  font-size: var(--font-size-2xl, var(--font-size-xl));
  font-weight: 700;
  margin: 0;
  color: var(--md-sys-color-primary);
  line-height: 1.2;
`

const ProjectSubtitle = styled.p`
  font-size: var(--font-size-m);
  margin: 6px 0 0;
  color: var(--md-sys-color-on-surface-variant);
`

const DashboardHeader = ({ header, projectName }: DashboardHeaderProps) => {
  const [hasBanner, setHasBanner] = useState(header.has_banner)
  const [bannerKey, setBannerKey] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)
    try {
      await uploadBanner(projectName, file)
      setHasBanner(true)
      setBannerKey((k) => k + 1) // bust the cached image
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
      // reset so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleRemove = async () => {
    setRemoving(true)
    setUploadError(null)
    try {
      await removeBanner(projectName)
      setHasBanner(false)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Remove failed")
    } finally {
      setRemoving(false)
    }
  }

  return (
    <HeaderWrapper>
      <BannerArea>
        {hasBanner ? (
          <BannerImage
            key={bannerKey}
            src={`${getBannerUrl(projectName)}?v=${bannerKey}`}
            alt={`${header.project_title || projectName} banner`}
          />
        ) : (
          <BannerPlaceholder>No banner — hover to upload</BannerPlaceholder>
        )}

        <ButtonRow className="banner-btns">
          {hasBanner && (
            <UploadBtn
              disabled={uploading || removing}
              title="Remove banner"
              onClick={handleRemove}
            >
              {removing ? "Removing…" : "✕ Remove"}
            </UploadBtn>
          )}
          <UploadBtn
            disabled={uploading || removing}
            title="Upload banner image (JPEG, PNG, WebP or GIF, max 5 MB)"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "Uploading…" : "⬆ Upload banner"}
          </UploadBtn>
        </ButtonRow>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </BannerArea>

      {uploadError && (
        <div
          style={{
            padding: "4px 12px",
            fontSize: "var(--font-size-s)",
            color: "var(--md-sys-color-error)",
          }}
        >
          {uploadError}
        </div>
      )}

      <HeaderContent>
        <ProjectTitle>{header.project_title || projectName}</ProjectTitle>
        {header.show_subtitle && header.subtitle && (
          <ProjectSubtitle>{header.subtitle}</ProjectSubtitle>
        )}
      </HeaderContent>
    </HeaderWrapper>
  )
}

export default DashboardHeader

