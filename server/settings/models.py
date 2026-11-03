from typing import List

from ayon_server.enum import EnumItem, EnumRegistry
from ayon_server.settings import BaseSettingsModel, SettingsField


async def users_enum() -> list[EnumItem]:
    """Studio user list for the Key Personnel dropdown (no project scoping)."""
    return await EnumRegistry.resolve("users")


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
        enum_resolver=users_enum,
    )
    role: str = SettingsField("", title="Role")
    enabled: bool = SettingsField(True, title="Enabled")


class ProjectDashboardSettings(BaseSettingsModel):
    enabled: bool = SettingsField(True, title="Enabled")
    refs_enabled: bool = SettingsField(False, title="Show References")
    refs_thumbnail_size: int = SettingsField(140, title="Thumbnail Size (px)")
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
            {
                "title": "Formatting Guide",
                "content": (
                    "## Headings\n"
                    "Use `#`, `##`, or `###` to break a block into sections.\n\n"
                    "### Text styling\n"
                    "You can use **bold**, *italic*, `inline code`, and "
                    "[links](https://ayon.ynput.io).\n\n"
                    "> Blockquotes are handy for callouts and warnings.\n\n"
                    "### Lists\n"
                    "- Bullet points for loose notes\n"
                    "- Another item\n\n"
                    "1. Numbered steps\n"
                    "2. Keep them in order\n\n"
                    "### Tables\n"
                    "| Shot | Status | Artist |\n"
                    "| --- | --- | --- |\n"
                    "| SH010 | Approved | J. Smith |\n"
                    "| SH020 | In Progress | A. Jones |\n\n"
                    "Delete or edit this block once you're familiar with the "
                    "options above."
                ),
            },
        ],
        title="Content Blocks",
    )
    summary: List[SummaryItem] = SettingsField(
        default_factory=lambda: [
            {"name": "Resolution", "content": "1920 x 1080"},
            {"name": "Frame Rate", "content": "24 fps"},
            {"name": "Start Date", "content": ""},
            {"name": "End Date", "content": ""},
            {"name": "Colorspace", "content": "sRGB"},
        ],
        title="Project Summary",
    )
    key_personnel: List[PersonItem] = SettingsField(
        default_factory=lambda: [
            {"username": "", "role": "Director", "enabled": False},
            {"username": "", "role": "Producer", "enabled": False},
            {"username": "", "role": "Production Assistant", "enabled": False},
            {"username": "", "role": "Comp Lead", "enabled": False},
            {"username": "", "role": "Head of 2d", "enabled": False},
            {"username": "", "role": "Head of Comp", "enabled": False},
            {"username": "", "role": "Head of CG", "enabled": False},
        ],
        title="Key Personnel",
    )
    links: List[LinkItem] = SettingsField(
        default_factory=lambda: [
            {
                "title": "IT Support",
                "url": "https://app.slack.com/client/T59JJJKL7/C01631FTQER",
                "icon": "computer",
                "open_external": True,
                "enabled": True,
            },
            {
                "title": "Miro Board",
                "url": "",
                "icon": "dashboard",
                "open_external": True,
                "enabled": False,
            },
            {
                "title": "AYON Support",
                "url": "https://app.slack.com/client/T59JJJKL7/C0BDZTVTMK9",
                "icon": "forum",
                "open_external": True,
                "enabled": True,
            },
            {
                "title": "THE LINE General",
                "url": "https://app.slack.com/client/T59JJJKL7/C59J0B5U6",
                "icon": "chat",
                "open_external": True,
                "enabled": False,
            },
        ],
        title="Links",
    )
