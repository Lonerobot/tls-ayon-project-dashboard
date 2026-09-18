import json
import logging
import os
import re
import uuid
from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import Response

from ayon_server.api.dependencies import CurrentUser
from ayon_server.exceptions import ForbiddenException, NotFoundException
from ayon_server.files import Storages

log = logging.getLogger(__name__)

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
_MAX_REF_COUNT: int = 6

# Namespace used to derive deterministic, storage-safe (32 hex char) file ids.
# Images are persisted via ayon_server's own ProjectStorage abstraction (using
# the "thumbnails" file group as a generic small-blob store) rather than an
# ad-hoc local filesystem path. ProjectStorage transparently supports either
# local disk or S3 depending on how the AYON server is configured, so this
# works identically in local Docker testing and on managed/cloud hosting -
# unlike raw local paths, which are not guaranteed to be persistent or shared
# across server replicas.
_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_URL, "ayon-project-dashboard")


def _manifest_file_id(project_name: str) -> str:
    return uuid.uuid5(_NAMESPACE, f"manifest:{project_name}").hex


def _banner_file_id(project_name: str) -> str:
    return uuid.uuid5(_NAMESPACE, f"banner:{project_name}").hex


def _slugify(name: str) -> str:
    stem = Path(name).stem
    slug = re.sub(r"[^a-z0-9]+", "_", stem.lower()).strip("_")
    return slug or "ref"


async def _load_manifest(storage: Any, project_name: str) -> Dict[str, Any]:
    """Load the addon's small per-project metadata blob (banner mime + ref list).

    Stored alongside the actual image bytes in the same project storage backend
    (local disk or S3, whichever the AYON server is configured for), so it is
    always consistent with the images it describes.
    """
    try:
        raw = await storage.get_thumbnail(_manifest_file_id(project_name))
    except FileNotFoundError:
        raw = None
    except Exception:
        log.exception("Failed to load dashboard manifest for %r", project_name)
        raw = None

    manifest: Dict[str, Any] = {"banner_mime": None, "refs": []}
    if raw:
        try:
            loaded = json.loads(raw.decode("utf-8"))
            manifest["banner_mime"] = loaded.get("banner_mime")
            manifest["refs"] = loaded.get("refs", [])
        except Exception:
            log.exception("Failed to parse dashboard manifest for %r", project_name)
    return manifest


async def _save_manifest(
    storage: Any, project_name: str, manifest: Dict[str, Any]
) -> None:
    payload = json.dumps(manifest).encode("utf-8")
    await storage.store_thumbnail(_manifest_file_id(project_name), payload)


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

        storage = await Storages.project(project_name)
        manifest = await _load_manifest(storage, project_name)

        # Inject runtime banner presence flag so the frontend can decide
        # whether to request the banner image.
        data["header"]["has_banner"] = manifest["banner_mime"] is not None

        return data

    @router.post("/{project_name}/banner", status_code=204)
    async def upload_banner(
        project_name: str,
        file: UploadFile,
        user: CurrentUser,
    ) -> Response:
        """Upload a banner image for the given project."""
        if not user.is_manager:
            raise ForbiddenException("Only managers and admins can upload banners.")
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

        storage = await Storages.project(project_name)
        await storage.store_thumbnail(_banner_file_id(project_name), content)

        manifest = await _load_manifest(storage, project_name)
        manifest["banner_mime"] = file.content_type
        await _save_manifest(storage, project_name, manifest)

        return Response(status_code=204)

    @router.delete("/{project_name}/banner", status_code=204)
    async def delete_banner(
        project_name: str,
        user: CurrentUser,
    ) -> Response:
        """Remove the stored banner image for the given project."""
        if not user.is_manager:
            raise ForbiddenException("Only managers and admins can remove banners.")

        storage = await Storages.project(project_name)
        manifest = await _load_manifest(storage, project_name)
        if manifest["banner_mime"] is None:
            raise NotFoundException(detail="No banner is configured for this project.")

        await storage.delete_thumbnail(_banner_file_id(project_name))
        manifest["banner_mime"] = None
        await _save_manifest(storage, project_name, manifest)

        return Response(status_code=204)

    @router.get("/{project_name}/banner")
    async def get_banner(
        project_name: str,
        user: CurrentUser,
    ) -> Response:
        """Stream the stored banner image for the given project."""
        storage = await Storages.project(project_name)
        manifest = await _load_manifest(storage, project_name)
        mime = manifest["banner_mime"]
        if mime is None:
            raise NotFoundException(detail="No banner is configured for this project.")

        try:
            content = await storage.get_thumbnail(_banner_file_id(project_name))
        except FileNotFoundError:
            raise NotFoundException(
                detail="No banner is configured for this project."
            ) from None

        return Response(
            content=content,
            media_type=mime,
            headers={
                "Cache-Control": "public, max-age=3600",
                "Content-Disposition": "inline",
            },
        )

    # ── References ───────────────────────────────────────────────────────────

    @router.get("/{project_name}/refs")
    async def list_refs(
        project_name: str,
        user: CurrentUser,
    ) -> List[str]:
        """Return filenames of stored reference images, oldest-first."""
        storage = await Storages.project(project_name)
        manifest = await _load_manifest(storage, project_name)
        return [ref["filename"] for ref in manifest["refs"]]

    @router.post("/{project_name}/refs", status_code=204)
    async def upload_ref(
        project_name: str,
        file: UploadFile,
        user: CurrentUser,
    ) -> Response:
        """Upload a reference image (manager/admin only)."""
        if not user.is_manager:
            raise ForbiddenException("Only managers and admins can upload references.")
        if file.content_type not in _ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported type: {file.content_type!r}.",
            )
        content = await file.read()
        if len(content) > _MAX_BANNER_SIZE_BYTES:
            raise HTTPException(status_code=413, detail="File exceeds 5 MB limit.")

        storage = await Storages.project(project_name)
        manifest = await _load_manifest(storage, project_name)
        refs: List[Dict[str, str]] = manifest["refs"]

        if len(refs) >= _MAX_REF_COUNT:
            raise HTTPException(
                status_code=409,
                detail=f"Maximum of {_MAX_REF_COUNT} references already stored.",
            )

        ext = _BANNER_EXTENSIONS[file.content_type]
        slug = _slugify(file.filename or "ref")
        existing_names = {ref["filename"] for ref in refs}
        filename = f"{slug}{ext}"
        counter = 1
        while filename in existing_names:
            filename = f"{slug}_{counter}{ext}"
            counter += 1

        file_id = uuid.uuid4().hex
        await storage.store_thumbnail(file_id, content)

        refs.append({"id": file_id, "filename": filename, "mime": file.content_type})
        await _save_manifest(storage, project_name, manifest)

        return Response(status_code=204)

    @router.delete("/{project_name}/refs/{filename}", status_code=204)
    async def delete_ref(
        project_name: str,
        filename: str,
        user: CurrentUser,
    ) -> Response:
        """Remove a reference image by filename (manager/admin only)."""
        if not user.is_manager:
            raise ForbiddenException("Only managers and admins can remove references.")

        storage = await Storages.project(project_name)
        manifest = await _load_manifest(storage, project_name)
        refs: List[Dict[str, str]] = manifest["refs"]

        match = next((ref for ref in refs if ref["filename"] == filename), None)
        if match is None:
            raise NotFoundException(detail=f"Reference {filename!r} not found.")

        await storage.delete_thumbnail(match["id"])
        refs.remove(match)
        await _save_manifest(storage, project_name, manifest)

        return Response(status_code=204)

    @router.get("/{project_name}/refs/{filename}")
    async def get_ref(
        project_name: str,
        filename: str,
        user: CurrentUser,
    ) -> Response:
        """Stream a reference image."""
        storage = await Storages.project(project_name)
        manifest = await _load_manifest(storage, project_name)
        refs: List[Dict[str, str]] = manifest["refs"]

        match = next((ref for ref in refs if ref["filename"] == filename), None)
        if match is None:
            raise NotFoundException(detail=f"Reference {filename!r} not found.")

        try:
            content = await storage.get_thumbnail(match["id"])
        except FileNotFoundError:
            raise NotFoundException(detail=f"Reference {filename!r} not found.") from None

        mime = match.get("mime", "application/octet-stream")
        return Response(
            content=content,
            media_type=mime,
            headers={
                "Cache-Control": "public, max-age=3600",
                "Content-Disposition": "inline",
            },
        )

    return router


# ── Legacy local-disk migration (best-effort) ─────────────────────────────────
#
# Earlier versions of this addon stored banners/refs directly on the local
# filesystem under an addon-invented AYON_DATA_DIR path. That path is not a
# recognized AYON storage location and is not guaranteed to be persistent or
# shared across replicas on managed/cloud hosting - it only appeared to work
# in single-container local Docker testing. This best-effort migration copies
# any files found there (e.g. from an on-prem deployment) into the officially
# supported ayon_server project storage backend on startup.


def _legacy_addon_root(addon_name: str) -> Path:
    data_root = Path(os.environ.get("AYON_DATA_DIR", "/srv/ayon/data"))
    return data_root / "addons" / addon_name / "storage"


def _migrate_old_versioned_banners(addon_name: str) -> None:
    """One-off cleanup for an even older layout used by earlier addon versions.

    Old: …/addons/{name}/{version}/banners/{project}/banner.*
    New: …/addons/{name}/storage/{project}/banner.*  (picked up below)
    """
    data_root = Path(os.environ.get("AYON_DATA_DIR", "/srv/ayon/data"))
    addon_root = data_root / "addons" / addon_name
    if not addon_root.is_dir():
        return

    for banner_file in addon_root.glob("*/banners/*/banner.*"):
        project_name = banner_file.parent.name
        dest_dir = addon_root / "storage" / project_name
        dest_file = dest_dir / banner_file.name

        if dest_file.exists():
            continue  # already migrated or a newer upload exists

        dest_dir.mkdir(parents=True, exist_ok=True)
        banner_file.replace(dest_file)
        log.info("Migrated banner for project %r to %s", project_name, dest_file)


async def migrate_legacy_storage(addon_name: str) -> None:
    _migrate_old_versioned_banners(addon_name)

    legacy_root = _legacy_addon_root(addon_name)
    if not legacy_root.is_dir():
        return

    for project_dir in legacy_root.iterdir():
        if not project_dir.is_dir():
            continue
        project_name = project_dir.name

        try:
            storage = await Storages.project(project_name)
            manifest = await _load_manifest(storage, project_name)

            if manifest["banner_mime"] is None:
                for ext, mime in _MIME_BY_EXTENSION.items():
                    legacy_banner = project_dir / f"banner{ext}"
                    if legacy_banner.exists():
                        content = legacy_banner.read_bytes()
                        await storage.store_thumbnail(
                            _banner_file_id(project_name), content
                        )
                        manifest["banner_mime"] = mime
                        legacy_banner.unlink()
                        log.info(
                            "Migrated legacy banner for project %r to project storage",
                            project_name,
                        )
                        break

            if not manifest["refs"]:
                refs_dir = project_dir / "refs"
                if refs_dir.is_dir():
                    legacy_refs = sorted(
                        (
                            f
                            for f in refs_dir.iterdir()
                            if f.suffix in _MIME_BY_EXTENSION
                        ),
                        key=lambda f: f.stat().st_mtime,
                    )
                    for legacy_ref in legacy_refs:
                        mime = _MIME_BY_EXTENSION[legacy_ref.suffix]
                        file_id = uuid.uuid4().hex
                        await storage.store_thumbnail(
                            file_id, legacy_ref.read_bytes()
                        )
                        manifest["refs"].append(
                            {
                                "id": file_id,
                                "filename": legacy_ref.name,
                                "mime": mime,
                            }
                        )
                        legacy_ref.unlink()
                    if legacy_refs:
                        log.info(
                            "Migrated %d legacy reference(s) for project %r",
                            len(legacy_refs),
                            project_name,
                        )

            await _save_manifest(storage, project_name, manifest)
        except Exception:
            log.exception(
                "Failed to migrate legacy dashboard storage for project %r",
                project_name,
            )
