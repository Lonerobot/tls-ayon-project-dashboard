from typing import List

from ayon_server.settings import BaseSettingsModel, SettingsField


class LinkItem(BaseSettingsModel):
    _layout = "compact"

    title: str = SettingsField("", title="Title")
    url: str = SettingsField("", title="URL")
    icon: str = SettingsField("link", title="Icon", widget="icon")
    open_external: bool = SettingsField(True, title="Open in new tab")
    enabled: bool = SettingsField(True, title="Enabled")


class HeaderSettings(BaseSettingsModel):
    project_title: str = SettingsField("", title="Project Title")
    show_subtitle: bool = SettingsField(False, title="Show Subtitle")
    subtitle: str = SettingsField("", title="Subtitle")


class ContentBlock(BaseSettingsModel):
    title: str = SettingsField("", title="Block Title")
    content: str = SettingsField(
        "",
        title="Content",
        widget="textarea",
        description="Supports Markdown formatting.",
    )


class SummaryItem(BaseSettingsModel):
    _layout = "compact"

    name: str = SettingsField("", title="Label")
    content: str = SettingsField("", title="Value")


class PersonItem(BaseSettingsModel):
    _layout = "compact"

    username: str = SettingsField(
        "",
        title="AYON Username",
        description="The user's AYON login name (e.g. john.smith).",
    )
    role: str = SettingsField("", title="Role")
    enabled: bool = SettingsField(True, title="Enabled")


class ProjectDashboardSettings(BaseSettingsModel):
    enabled: bool = SettingsField(True, title="Enabled")
    header: HeaderSettings = SettingsField(
        default_factory=HeaderSettings,
        title="Header",
    )
    content_blocks: List[ContentBlock] = SettingsField(
        default_factory=lambda: [
            {
                "title": "Project Overview",
                "content": (
                    "Brief description of the project goals, deliverables, and any "
                    "key context the team should be aware of.\n\n"
                    "**Client:** \n"
                    "**Studio:** \n"
                    "**Format:** "
                ),
            },
            {
                "title": "Delivery Requirements",
                "content": (
                    "List the technical delivery specs here.\n\n"
                    "- **Codec:** \n"
                    "- **Resolution:** \n"
                    "- **Frame rate:** \n"
                    "- **Colour space:** "
                ),
            },
            {
                "title": "Notes",
                "content": "Ongoing notes, decisions, and reminders for the team.",
            },
        ],
        title="Content Blocks",
    )
    summary: List[SummaryItem] = SettingsField(
        default_factory=lambda: [
            {"name": "Resolution", "content": ""},
            {"name": "Frame Rate", "content": ""},
            {"name": "Start Date", "content": ""},
            {"name": "End Date", "content": ""},
        ],
        title="Project Summary",
    )
    key_personnel: List[PersonItem] = SettingsField(
        default_factory=lambda: [
            {"username": "", "role": "VFX Supervisor", "enabled": True},
            {"username": "", "role": "Producer", "enabled": True},
            {"username": "", "role": "Production Coordinator", "enabled": True},
        ],
        title="Key Personnel",
    )
    links: List[LinkItem] = SettingsField(
        default_factory=lambda: [
            {
                "title": "Project Brief",
                "url": "",
                "icon": "description",
                "open_external": True,
                "enabled": False,
            },
            {
                "title": "Miro Board",
                "url": "",
                "icon": "dashboard",
                "open_external": True,
                "enabled": False,
            },
            {
                "title": "Slack Channel",
                "url": "",
                "icon": "forum",
                "open_external": True,
                "enabled": False,
            },
            {
                "title": "Asset Library",
                "url": "",
                "icon": "folder",
                "open_external": True,
                "enabled": False,
            },
        ],
        title="Links",
    )
