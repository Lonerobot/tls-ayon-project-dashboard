import DashboardPanel from "../pages/DashboardPanel"

/**
 * Standalone dev entry point.
 *
 * Run `yarn dev` in the frontend/ directory to open this in the browser.
 * The Vite dev server proxies /api requests to your local AYON instance
 * (configured via SERVER_URL in .env.local).
 *
 * To run without an AYON server, add VITE_USE_MOCK_DATA=true to .env.local.
 */
const DevWrapper = () => (
  <div
    style={{
      width: "100%",
      minHeight: "100vh",
      background: "var(--md-sys-color-surface)",
      color: "var(--md-sys-color-on-surface)",
      fontFamily: "var(--font-family)",
    }}
  >
    <DashboardPanel projectName="halloween" />
  </div>
)

export default DevWrapper
