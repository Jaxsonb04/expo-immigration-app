import { cn } from 'heroui-native'
import { ScrollView, type ScrollViewProps } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export const BodyScrollView = ({ contentContainerClassName, ...props }: ScrollViewProps) => {
	const insets = useSafeAreaInsets()
	return (
		<ScrollView
			automaticallyAdjustsScrollIndicatorInsets
			contentInsetAdjustmentBehavior="automatic"
			showsVerticalScrollIndicator={false}
			contentContainerClassName={cn('px-5', contentContainerClassName)}
			contentContainerStyle={{
				paddingBottom: insets.bottom + 32,
			}}
			{...props}
		/>
	)
}
