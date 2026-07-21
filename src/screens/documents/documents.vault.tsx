import { SectionHeading } from '@/components/core'
import { StyledLucideIcon } from '@/components/styled-icon'
import { documentTypeLabel, formatIsoDate } from '@/lib/application-labels'
import { useRouter, type Href } from 'expo-router'
import { Chip, Typography } from 'heroui-native'
import { Pressable, View } from 'react-native'
import { useVaultContext } from './documents.context'
import type { VaultDocument } from './documents.data'

function Heading() {
	return <SectionHeading title="Your documents" />
}

/** `basePath` keeps the push inside whichever stack mounted this screen
 * (Forms' `/documents` or Account's `/account/documents`) — this same list
 * renders in both tabs, and pressable rows shouldn't yank the user across
 * tabs to see their own detail. */
function Row(props: { document: VaultDocument; basePath: string }) {
	const router = useRouter()
	const { document, basePath } = props
	return (
		<Pressable
			accessibilityRole="button"
			onPress={() => router.push(`${basePath}/${document._id}` as Href)}
			className={`flex-row items-center gap-control py-tight ${document.isCurrent ? '' : 'opacity-50'}`}
		>
			<StyledLucideIcon name="file-text" size={20} className="text-muted" />
			<View className="flex-1">
				<Typography.Paragraph className="font-medium">
					{document.label ?? documentTypeLabel(document.type)}
				</Typography.Paragraph>
				<Typography.Paragraph color="muted" className="text-sm">
					{document.applicantName}
					{document.expiryDate !== undefined && ` · expires ${formatIsoDate(document.expiryDate)}`}
				</Typography.Paragraph>
			</View>
			{!document.isCurrent && (
				<Chip size="sm" variant="soft">
					<Chip.Label>Replaced</Chip.Label>
				</Chip>
			)}
			<StyledLucideIcon name="chevron-right" size={16} className="text-muted" />
		</Pressable>
	)
}

function Empty() {
	return (
		<Typography.Paragraph color="muted">
			Documents you add — passport, EAD, Green Card, I-94 — live here and are reused across
			applications. Capture arrives with the upload sheet.
		</Typography.Paragraph>
	)
}

function List({ basePath }: { basePath: string }) {
	const { documents } = useVaultContext()
	if (documents.length === 0) return <Empty />
	return (
		<>
			{documents.map((document) => (
				<Row key={document._id} document={document} basePath={basePath} />
			))}
		</>
	)
}

export const VaultDocuments = {
	Heading,
	List,
	Row,
	Empty,
}
