import logging
from typing import Any, Dict, List, Type

from ayon_server.addons import BaseServerAddon

from .settings.models import ProjectDashboardSettings

log = logging.getLogger(__name__)


class ProjectDashboard(BaseServerAddon):
    title = "Project Dashboard"
    settings_model: Type[ProjectDashboardSettings] = ProjectDashboardSettings
    addon_type = "server"

    frontend_modules = {
        "dashboard": ["ProjectDashboard"],
    }

    async def get_frontend_modules(self) -> Dict[str, List[str]]:
        """Hide the frontend module (and its project nav tab) entirely when
        the addon is disabled via studio settings.

        The server's /frontendModules endpoint calls this with no project
        context, so this can only reflect the studio-level default - a
        project-level override of "enabled" still just hides the panel
        content (see DashboardPanel), not the tab itself.
        """
        settings: Any = await self.get_studio_settings()
        if settings is not None and not settings.enabled:
            return {}
        return self.frontend_modules

    async def setup(self) -> None:
        from .api.dashboard import create_router, migrate_legacy_storage
        from .settings_migration import migrate_settings_from_previous_version

        await migrate_legacy_storage(self.name)

        try:
            await migrate_settings_from_previous_version(self)
        except Exception:
            log.exception("Settings migration from previous version failed")

        self.add_router(create_router(self))
