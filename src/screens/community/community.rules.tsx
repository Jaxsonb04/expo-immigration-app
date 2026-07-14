import { BodyScrollView } from '@/components/core'
import { styledIcon, type StyledIconComponent } from '@/components/styled-icon'
import { Surface, Typography } from 'heroui-native'
import { View } from 'react-native'

// M4-T3 forum rules: a short, static covenant. Linked from the feed header
// and the composer ("By posting you agree to the community rules"), and it is
// what a moderator enforces with hide/restore.

type Rule = { icon: StyledIconComponent; title: string; body: string }

const RULES: Rule[] = [
	{
		icon: styledIcon({ family: 'lucide', name: 'heart-handshake' }),
		title: 'Peer support, not legal advice',
		body: 'People here share their own experience. Nothing posted is legal advice — for your case, rely on uscis.gov or a licensed attorney or DOJ-accredited representative.',
	},
	{
		icon: styledIcon({ family: 'lucide', name: 'shield' }),
		title: 'Never post personal case details',
		body: 'No A-Numbers, receipt numbers, addresses, document photos, or anything that identifies you or someone else. This is a public space.',
	},
	{
		icon: styledIcon({ family: 'lucide', name: 'message-circle' }),
		title: 'Be respectful',
		body: 'Immigration is stressful. No harassment, hate, or pile-ons — disagree with the idea, not the person.',
	},
	{
		icon: styledIcon({ family: 'lucide', name: 'badge-dollar-sign' }),
		title: 'No solicitation',
		body: 'No ads, self-promotion, or offers of paid services — including legal services.',
	},
	{
		icon: styledIcon({ family: 'lucide', name: 'flag' }),
		title: 'Report what looks wrong',
		body: 'See spam, harassment, or someone giving legal advice? Use Report — it goes straight to the moderators.',
	},
	{
		icon: styledIcon({ family: 'lucide', name: 'eye-off' }),
		title: 'Moderators may hide content',
		body: 'Posts and comments that break these rules can be hidden by moderators. You can also block any author to stop seeing them yourself.',
	},
]

function RuleRow({ rule, index }: { rule: Rule; index: number }) {
	const Icon = rule.icon
	return (
		<Surface variant="secondary" className="flex-row gap-3.5 rounded-2xl p-4">
			<View className="pt-0.5">
				<Icon size={18} className="text-muted" />
			</View>
			<View className="flex-1 gap-1">
				<Typography.Paragraph className="font-semibold leading-snug">
					{index + 1}. {rule.title}
				</Typography.Paragraph>
				<Typography.Paragraph color="muted" className="text-sm leading-relaxed">
					{rule.body}
				</Typography.Paragraph>
			</View>
		</Surface>
	)
}

/** Static community rules (M4-T3). */
export function CommunityRulesScreen() {
	return (
		<BodyScrollView contentContainerClassName="gap-5 py-5">
			<View className="gap-1">
				<Typography.Paragraph color="muted" className="leading-relaxed">
					A few ground rules keep the community a safe place to compare notes on USCIS renewals.
				</Typography.Paragraph>
			</View>
			<View className="gap-2.5">
				{RULES.map((rule, index) => (
					<RuleRow key={rule.title} rule={rule} index={index} />
				))}
			</View>
			<Typography.Paragraph color="muted" className="text-center text-xs leading-relaxed">
				By posting or commenting you agree to these rules.
			</Typography.Paragraph>
		</BodyScrollView>
	)
}
