from typing import Type

from ayon_server.addons import BaseServerAddon

from .settings.models import ProjectDashboardSettings


class ProjectDashboard(BaseServerAddon):
    title = "Project Dashboard"
    settings_model: Type[ProjectDashboardSettings] = ProjectDashboardSettings
    addon_type = "server"

    # Module Federation module declarations.
    # "DashboardOverview" targets the project overview right-hand panel.
    frontend_modules = {
        "dashboard": ["ProjectDashboard"],
    }

    async def setup(self) -> None:
        from .api.dashboard import create_router

        self.add_router(create_router(self))
