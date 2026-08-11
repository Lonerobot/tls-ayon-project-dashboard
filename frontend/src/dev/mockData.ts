import type { DashboardData } from "../models/dashboard"

export const mockDashboardData: DashboardData = {
  enabled: true,
  header: {
    project_title: "Project Halloween",
    show_subtitle: true,
    subtitle: "Discord Banner Campaign — 2026",
    has_banner: true,
  },
  content_blocks: [
    {
      title: "Overview",
      content: `This project delivers a series of Halloween-themed Discord banners for the studio's social media channels.

**Goals:**
- Complete all banner assets by October 1st
- Maintain consistent character design across all pieces
- Deliver in 16:9 and square formats`,
    },
    {
      title: "Key Characters",
      content: `- **Lottie** — primary character\n- **Meowy** — the cat companion\n- **Umbra** — the shadow character`,
    },
    {
      title: "Notes",
      content: `> Client has requested subtle expressions — avoid overly cartoonish poses.\n> Background will be refined at styleframe stage.`,
    },
  ],
  summary: [
    { name: "Resolution", content: "1920 × 1080" },
    { name: "Start Date", content: "2026-08-01" },
    { name: "End Date", content: "2026-10-01" },
    { name: "Client", content: "Kwok Industries" },
  ],
  key_personnel: [
    { username: "jane.doe", role: "VFX Supervisor", enabled: true },
    { username: "john.smith", role: "Producer", enabled: true },
    { username: "alex.chen", role: "Production Coordinator", enabled: true },
  ],
  links: [
    {
      title: "Miro Board",
      url: "https://miro.com",
      icon: "dashboard",
      open_external: true,
      enabled: true,
    },
    {
      title: "Design Brief",
      url: "https://notion.so",
      icon: "description",
      open_external: true,
      enabled: true,
    },
    {
      title: "Asset Library",
      url: "https://drive.google.com",
      icon: "folder",
      open_external: true,
      enabled: true,
    },
    {
      title: "GitHub Repo",
      url: "https://github.com",
      icon: "code",
      open_external: true,
      enabled: true,
    },
  ],
}
