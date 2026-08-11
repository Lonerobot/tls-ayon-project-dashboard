import DashboardPanel from "../pages/DashboardPanel"

interface DashboardRemoteProps {
  projectName?: string
  [key: string]: unknown
}

/**
 * Module Federation remote entry exposed as "./ProjectDashboard".
 *
 * AYON's useLoadModules spreads the default export object to build the remote
 * page entry. The object must include:
 *   - component: the React component AYON renders via <ProjectPageRemote>
 *   - module:    must match the module name key ("ProjectDashboard") so that
 *                remotePages.find((r) => r.module === module) resolves
 *   - name:      display label shown in the project navigation bar
 *   - id:        stable React key for the rendered remote page
 */
const DashboardRemote = ({ projectName = "" }: DashboardRemoteProps) => (
  <DashboardPanel projectName={projectName} />
)

export default {
  component: DashboardRemote,
  module: "ProjectDashboard",
  name: "Dashboard",
  id: "project-dashboard",
}
