import { CaseDetailScreen } from '@/screens/cases'
import type { Id } from '@convex/_generated/dataModel'
import { Stack, useLocalSearchParams } from 'expo-router'

export default function CaseRoute() {
	const { caseId } = useLocalSearchParams<{ caseId: string }>()
	return (
		<>
			<Stack.Title>Case</Stack.Title>
			<CaseDetailScreen caseId={caseId as Id<'cases'>} />
		</>
	)
}
