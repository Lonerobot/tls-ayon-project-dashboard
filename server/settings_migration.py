"""Settings migration safety net for addon version upgrades.

AYON stores addon overrides keyed by the *exact* addon version
(addon_name, addon_version, variant), both for studio and per-project
settings. When the server's built-in bundle-patch migration hook runs (i.e.
an admin edits an *existing* production bundle's addon version pin in
place), it automatically copies overrides from the previous version to the
new one via ``BaseServerAddon.convert_settings_overrides``.

That hook only fires on an in-place bundle patch though - if a brand new
bundle is created with the new addon version and then promoted to
production directly (a common deployment pattern, e.g. via
``create_package.py``), the hook never runs and every project that had this
addon configured on an older version silently reverts to defaults.

This module re-implements the same copy-forward logic scoped to this addon
only, and runs it unconditionally on every server startup (see
``server/__init__.py``). It is idempotent: it only ever fills in overrides
that don't already exist for the current version, so it never clobbers
settings an admin has already configured on the new version.
"""

import logging
from typing import Any, Optional

from semver import VersionInfo

log = logging.getLogger(__name__)

_VARIANTS = ("production", "staging")


def _parse_version(value: str) -> Optional[VersionInfo]:
    try:
        return VersionInfo.parse(value)
    except ValueError:
        return None


async def _fetch_studio_overrides(
    addon_name: str, addon_version: str, variant: str
) -> dict[str, Any]:
    from ayon_server.lib.postgres import Postgres

    res = await Postgres.fetch(
        """
        SELECT data FROM public.settings
        WHERE addon_name = $1 AND addon_version = $2 AND variant = $3
        """,
        addon_name,
        addon_version,
        variant,
    )
    return res[0]["data"] if res else {}


async def _store_studio_overrides(
    addon_name: str, addon_version: str, variant: str, data: dict[str, Any]
) -> None:
    from ayon_server.lib.postgres import Postgres

    await Postgres.execute(
        """
        INSERT INTO public.settings (addon_name, addon_version, variant, data)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (addon_name, addon_version, variant) DO UPDATE SET data = $4
        """,
        addon_name,
        addon_version,
        variant,
        data,
    )


async def _fetch_project_overrides(
    project_name: str, addon_name: str, addon_version: str, variant: str
) -> dict[str, Any]:
    from ayon_server.lib.postgres import Postgres

    res = await Postgres.fetch(
        f"""
        SELECT data FROM project_{project_name}.settings
        WHERE addon_name = $1 AND addon_version = $2 AND variant = $3
        """,
        addon_name,
        addon_version,
        variant,
    )
    return res[0]["data"] if res else {}


async def _store_project_overrides(
    project_name: str,
    addon_name: str,
    addon_version: str,
    variant: str,
    data: dict[str, Any],
) -> None:
    from ayon_server.lib.postgres import Postgres

    await Postgres.execute(
        f"""
        INSERT INTO project_{project_name}.settings
        (addon_name, addon_version, variant, data)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (addon_name, addon_version, variant) DO UPDATE SET data = $4
        """,
        addon_name,
        addon_version,
        variant,
        data,
    )


async def migrate_settings_from_previous_version(addon: Any) -> None:
    """Copy studio/project overrides forward from the newest older installed
    version of this addon into the current version, for any variant/project
    that has no overrides yet on the current version."""

    from ayon_server.addons.library import AddonLibrary
    from ayon_server.helpers.project_list import get_project_list

    current_version = _parse_version(addon.version)
    if current_version is None:
        return

    try:
        definition = AddonLibrary.getinstance().get(addon.name)
    except Exception:
        log.exception("Unable to access addon library for settings migration")
        return
    if definition is None:
        return

    older_versions = sorted(
        (v for v in definition.versions if v != addon.version),
        key=lambda v: _parse_version(v) or VersionInfo(0, 0, 0),
        reverse=True,
    )
    older_versions = [
        v
        for v in older_versions
        if (parsed := _parse_version(v)) is not None and parsed < current_version
    ]
    if not older_versions:
        return

    try:
        project_names = [p.name for p in await get_project_list()]
    except Exception:
        log.exception("Unable to load project list for settings migration")
        project_names = []

    for variant in _VARIANTS:
        try:
            existing = await _fetch_studio_overrides(
                addon.name, addon.version, variant
            )
        except Exception:
            log.exception(
                "Unable to read studio overrides for %r (%s)", addon.name, variant
            )
            continue
        if existing:
            continue

        for source_version in older_versions:
            source_addon = definition.get(source_version)
            if source_addon is None:
                continue
            try:
                source_overrides = await source_addon.get_studio_overrides(
                    variant=variant
                )
            except Exception:
                continue
            if not source_overrides:
                continue
            try:
                converted = await addon.convert_settings_overrides(
                    source_version, source_overrides
                )
            except Exception:
                log.exception(
                    "Failed to convert studio overrides %s -> %s",
                    source_version,
                    addon.version,
                )
                break
            if converted:
                await _store_studio_overrides(
                    addon.name, addon.version, variant, converted
                )
                log.info(
                    "Migrated studio settings for %r from v%s to v%s (%s)",
                    addon.name,
                    source_version,
                    addon.version,
                    variant,
                )
            break

        for project_name in project_names:
            try:
                existing_project = await _fetch_project_overrides(
                    project_name, addon.name, addon.version, variant
                )
            except Exception:
                log.exception(
                    "Unable to read project overrides for %r/%r (%s)",
                    project_name,
                    addon.name,
                    variant,
                )
                continue
            if existing_project:
                continue

            for source_version in older_versions:
                source_addon = definition.get(source_version)
                if source_addon is None:
                    continue
                try:
                    source_overrides = await source_addon.get_project_overrides(
                        project_name, variant=variant
                    )
                except Exception:
                    continue
                if not source_overrides:
                    continue
                try:
                    converted = await addon.convert_settings_overrides(
                        source_version, source_overrides
                    )
                except Exception:
                    log.exception(
                        "Failed to convert project overrides for %r (%s -> %s)",
                        project_name,
                        source_version,
                        addon.version,
                    )
                    break
                if converted:
                    await _store_project_overrides(
                        project_name, addon.name, addon.version, variant, converted
                    )
                    log.info(
                        "Migrated project settings for %r on %r from v%s to v%s (%s)",
                        project_name,
                        addon.name,
                        source_version,
                        addon.version,
                        variant,
                    )
                break
