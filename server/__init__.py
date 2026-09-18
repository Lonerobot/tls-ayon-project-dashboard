import logging
from typing import Type

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

    async def setup(self) -> None:
        from .api.dashboard import create_router, migrate_legacy_storage
        from .settings_migration import migrate_settings_from_previous_version

        await migrate_legacy_storage(self.name)

        try:
            await migrate_settings_from_previous_version(self)
        except Exception:
            log.exception("Settings migration from previous version failed")

        self.add_router(create_router(self))
