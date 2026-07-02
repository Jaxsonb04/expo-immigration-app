import { SectionHeading } from '@/components/core'
import { StyledLucideIcon } from '@/components/styled-icon'
import { formatIsoDate } from '@/lib/application-labels'
import { Chip, Typography } from 'heroui-native'
import { View } from 'react-native'
import { useVaultContext } from './documents.context'
import type { VaultDocument } from './documents.data'

const documentTypeLabels: Record<VaultDocument['type'], string> = {
	passport: 'Passport',
	ead: 'EAD card',
	permanentResidentCard: 'Permanent Resident Card',
	i94: 'I-94 record',
	socialSecurityCard: 'Social Security card',
	photo: 'Photo',
	other: 'Document',
}

function Heading() {
	return <SectionHeading title="Your documents" />
}

function Row(props: { document: VaultDocument }) {
	const { document } = props
	return (
		<View className={`flex-row items-center gap-3 py-2 ${document.isCurrent ? '' : 'opacity-50'}`}>
			<StyledLucideIcon name="file-text" size={20} className="text-muted" />
			<View className="flex-1">
				<Typography.Paragraph className="font-medium">
					{document.label ?? documentTypeLabels[document.type]}
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
		</View>
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

function List() {
	const { documents } = useVaultContext()
	if (documents.length === 0) return <Empty />
	return (
		<>
			{documents.map((document) => (
				<Row key={document._id} document={document} />
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
