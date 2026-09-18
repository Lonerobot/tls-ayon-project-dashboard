import { useRef, useState } from "react"
import styled from "styled-components"

import type { HeaderSettings } from "../models/dashboard"
import { getBannerUrl, uploadBanner, removeBanner } from "../api/dashboardApi"

interface DashboardHeaderProps {
  header: HeaderSettings
  projectName: string
  canManage: boolean
}

const HeaderWrapper = styled.header`
  flex-shrink: 0;
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
  height: 160px;
  min-height: 160px;
  max-height: 240px;
  object-fit: cover;
  background-color: var(--md-sys-color-surface-container);
`

const BannerPlaceholder = styled.div`
  width: 100%;
  height: 80px;
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
  padding: var(--padding-s) var(--padding-m);
`

const DashboardHeader = ({ header, projectName, canManage }: DashboardHeaderProps) => {
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

        {canManage && (
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
        )}

        {canManage && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        )}
      </BannerArea>

      {uploadError && (
        <HeaderContent>
          <span style={{ fontSize: "var(--font-size-s)", color: "var(--md-sys-color-error)" }}>
            {uploadError}
          </span>
        </HeaderContent>
      )}
    </HeaderWrapper>
  )
}

export default DashboardHeader

