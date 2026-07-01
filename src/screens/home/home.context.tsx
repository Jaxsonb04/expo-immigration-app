import { createContext, use, type ReactNode } from 'react'
import type { HomeDashboard } from './home.data'

// Provider-led state sharing: every dashboard leaf reads from this context,
// so pieces can be added, removed, or rearranged in the screen without
// touching leaf internals.

const DashboardContext = createContext<HomeDashboard | null>(null)

export function DashboardProvider(props: { dashboard: HomeDashboard; children: ReactNode }) {
	return <DashboardContext value={props.dashboard}>{props.children}</DashboardContext>
}

export function useDashboard(): HomeDashboard {
	const dashboard = use(DashboardContext)
	if (dashboard === null) {
		throw new Error('Home dashboard components must be rendered inside <DashboardProvider>')
	}
	return dashboard
}
