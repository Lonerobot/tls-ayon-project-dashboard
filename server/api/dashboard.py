import os
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response

from ayon_server.api.dependencies import CurrentUser
from ayon_server.exceptions import NotFoundException

# ── File storage constants ────────────────────────────────────────────────────

_ALLOWED_MIME_TYPES: frozenset[str] = frozenset(
    {"image/jpeg", "image/png", "image/webp", "image/gif"}
)
_BANNER_EXTENSIONS: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
_MIME_BY_EXTENSION: dict[str, str] = {v: k for k, v in _BANNER_EXTENSIONS.items()}
_MAX_BANNER_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB


def _banner_dir(addon_name: str, addon_version: str, project_name: str) -> Path:
    """Return (and create) the per-project banner storage directory."""
    data_root = Path(os.environ.get("AYON_DATA_DIR", "/srv/ayon/data"))
    path = data_root / "addons" / addon_name / addon_version / "banners" / project_name
    path.mkdir(parents=True, exist_ok=True)
    return path


def _find_banner(banner_dir: Path) -> Optional[Path]:
    """Return the stored banner file if one exists, otherwise None."""
    for ext in _BANNER_EXTENSIONS.values():
        candidate = banner_dir / f"banner{ext}"
        if candidate.exists():
            return candidate
    return None


# ── Router factory ────────────────────────────────────────────────────────────


def create_router(addon: Any) -> APIRouter:
    """Create the dashboard API router, capturing a reference to the addon."""

    router = APIRouter(prefix="/dashboard")

    @router.get("/{project_name}", response_model=Dict[str, Any])
    async def get_dashboard_data(
        project_name: str,
        user: CurrentUser,
    ) -> Dict[str, Any]:
        """Return resolved project dashboard settings."""
        settings = await addon.get_project_settings(project_name)
        data: Dict[str, Any] = settings.dict()

        # Inject runtime banner presence flag so the frontend can decide
        # whether to request the banner image.
        bdir = _banner_dir(addon.name, addon.version, project_name)
        data["header"]["has_banner"] = _find_banner(bdir) is not None

        return data

    @router.post("/{project_name}/banner", status_code=204)
    async def upload_banner(
        project_name: str,
        file: UploadFile,
        user: CurrentUser,
    ) -> Response:
        """Upload a banner image for the given project."""
        if file.content_type not in _ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=415,
                detail=(
                    f"Unsupported media type: {file.content_type!r}. "
                    f"Accepted: {', '.join(sorted(_ALLOWED_MIME_TYPES))}."
                ),
            )

        content = await file.read()
        if len(content) > _MAX_BANNER_SIZE_BYTES:
            mb = _MAX_BANNER_SIZE_BYTES // (1024 * 1024)
            raise HTTPException(
                status_code=413,
                detail=f"File exceeds the {mb} MB size limit.",
            )

        ext = _BANNER_EXTENSIONS[file.content_type]
        bdir = _banner_dir(addon.name, addon.version, project_name)

        # Remove any pre-existing banner before writing the new one.
        for old in bdir.glob("banner.*"):
            old.unlink()

        (bdir / f"banner{ext}").write_bytes(content)
        return Response(status_code=204)

    @router.delete("/{project_name}/banner", status_code=204)
    async def delete_banner(
        project_name: str,
        user: CurrentUser,
    ) -> Response:
        """Remove the stored banner image for the given project."""
        bdir = _banner_dir(addon.name, addon.version, project_name)
        deleted = False
        for old in bdir.glob("banner.*"):
            old.unlink()
            deleted = True
        if not deleted:
            raise NotFoundException(detail="No banner is configured for this project.")
        return Response(status_code=204)

    @router.get("/{project_name}/banner")
    async def get_banner(
        project_name: str,
        user: CurrentUser,
    ) -> FileResponse:
        """Stream the stored banner image for the given project."""
        bdir = _banner_dir(addon.name, addon.version, project_name)
        banner_file = _find_banner(bdir)

        if banner_file is None:
            raise NotFoundException(detail="No banner is configured for this project.")

        media_type = _MIME_BY_EXTENSION.get(
            banner_file.suffix, "application/octet-stream"
        )
        return FileResponse(path=str(banner_file), media_type=media_type)

    return router
