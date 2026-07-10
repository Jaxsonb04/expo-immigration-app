import { SectionHeading } from '@/components/core'
import { StyledLucideIcon } from '@/components/styled-icon'
import { formatIsoDate } from '@/lib/application-labels'
import { useVault } from '@/screens/documents/documents.data'
import { router } from 'expo-router'
import { Button, Chip, Typography } from 'heroui-native'
import { View } from 'react-native'

const TYPE_LABELS: Record<string, string> = {
	passport: 'Passport',
	ead: 'EAD card',
	permanentResidentCard: 'Permanent Resident Card',
	i94: 'I-94 record',
	socialSecurityCard: 'Social Security card',
	photo: 'Photo',
	other: 'Document',
}

const PREVIEW_COUNT = 5

/**
 * The Document Vault surfaced on the Profile (M6-T5): everything already
 * uploaded, reusable across filings — the journey hub's "Use a saved document"
 * flow attaches these without a re-upload.
 */
export function ProfileDocuments() {
	const vault = useVault()
	const documents = (vault?.documents ?? []).filter((doc) => doc.isCurrent)
	const preview = documents.slice(0, PREVIEW_COUNT)

	return (
		<View className="gap-3">
			<View className="gap-1">
				<SectionHeading title="Your documents" />
				<Typography.Paragraph color="muted" className="text-sm">
					Uploads are saved once and reused — new filings can attach any of these instead of
					asking you to upload again.
				</Typography.Paragraph>
			</View>

			{preview.length === 0 ? (
				<Typography.Paragraph color="muted" className="text-sm">
					Nothing uploaded yet. Documents you add during a filing — passport, EAD, Green Card —
					collect here automatically.
				</Typography.Paragraph>
			) : (
				<View>
					{preview.map((doc) => (
						<View key={doc._id} className="flex-row items-center gap-3 py-2">
							<StyledLucideIcon name="file-text" size={20} className="text-muted" />
							<View className="flex-1">
								<Typography.Paragraph className="font-medium">
									{doc.label ?? TYPE_LABELS[doc.type] ?? 'Document'}
								</Typography.Paragraph>
								{doc.expiryDate !== undefined && (
									<Typography.Paragraph color="muted" className="text-sm">
										Expires {formatIsoDate(doc.expiryDate)}
									</Typography.Paragraph>
								)}
							</View>
						</View>
					))}
					{documents.length > PREVIEW_COUNT && (
						<Chip size="sm" variant="soft" className="self-start">
							<Chip.Label>{`+${documents.length - PREVIEW_COUNT} more`}</Chip.Label>
						</Chip>
					)}
				</View>
			)}

			<Button variant="secondary" onPress={() => router.push('/documents')}>
				<Button.Label>Open document vault</Button.Label>
			</Button>
		</View>
	)
}
