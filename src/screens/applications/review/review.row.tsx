import { StyledLucideIcon } from '@/components/styled-icon'
import type { FormType } from '@convex/shared/applicationShapes'
import type { ReviewRow as ReviewRowData } from '@convex/shared/reviewModel'
import { Typography } from 'heroui-native'
import { View } from 'react-native'
import { formatValue, labelFor } from './review.labels'

/** One answer line: label on the left, the formatted value or a status marker
 * on the right. Missing/invalid rows carry a warning icon; an optional field
 * left blank shows a neutral dash (never a warning). */
export function ReviewRow({ formType, row }: { formType: FormType; row: ReviewRowData }) {
	return (
		<View className="flex-row items-start justify-between gap-control py-hairline">
			<Typography.Paragraph color="muted" className="flex-1 text-sm">
				{labelFor(row.key)}
			</Typography.Paragraph>
			<View className="flex-[1.4] flex-row items-start justify-end gap-tight">
				{row.status === 'ok' && (
					<Typography.Paragraph className="flex-1 text-right text-sm">
						{formatValue(formType, row.key, row.rawValue)}
					</Typography.Paragraph>
				)}
				{(row.status === 'invalid' || row.status === 'blocked') && (
					<>
						<Typography.Paragraph className="flex-1 text-right text-sm">
							{formatValue(formType, row.key, row.rawValue)}
						</Typography.Paragraph>
						<StyledLucideIcon name="circle-alert" size={14} className="mt-hairline text-warning" />
					</>
				)}
				{row.status === 'missing' && (
					<>
						<Typography.Paragraph className="text-right text-sm text-warning">
							Not provided yet
						</Typography.Paragraph>
						<StyledLucideIcon name="circle-alert" size={14} className="mt-hairline text-warning" />
					</>
				)}
				{row.status === 'optional-blank' && (
					<Typography.Paragraph color="muted" className="text-right text-sm">
						—
					</Typography.Paragraph>
				)}
			</View>
		</View>
	)
}
