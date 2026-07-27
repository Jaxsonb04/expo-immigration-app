import { useConvexAuth } from 'convex/react'
import { Redirect } from 'expo-router'

import { RELEASE_HOME_PATH } from '@/lib/release-policy'

export default function HomeRoute() {
	const { isAuthenticated } = useConvexAuth()

	return <Redirect href={isAuthenticated ? RELEASE_HOME_PATH : '/welcome'} />
}
