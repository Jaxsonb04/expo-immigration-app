import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Convex functions are tested with `convex-test` running in the edge-runtime VM,
// per convex/_generated/ai/guidelines.md. Pure `src/` logic (e.g. the pdf-lib
// I-765 render) is also unit-tested here; those files opt into the Node
// environment with a `// @vitest-environment node` docblock. Full React Native
// component tests (if added later) still need a separate jest-expo project.
export default defineConfig({
	// Mirror the tsconfig path aliases so pure src/ modules (and their tests)
	// resolve the same way they do under Metro. Order matters: most specific
	// prefixes first.
	resolve: {
		alias: [
			{ find: /^@\/assets\//, replacement: fileURLToPath(new URL('./assets/', import.meta.url)) },
			{ find: /^@convex\//, replacement: fileURLToPath(new URL('./convex/', import.meta.url)) },
			{ find: /^@\//, replacement: fileURLToPath(new URL('./src/', import.meta.url)) },
		],
	},
	test: {
		environment: 'edge-runtime',
		include: ['convex/**/*.test.ts', 'src/**/*.test.ts'],
		server: {
			deps: {
				// convex-test must be transformed/inlined to run inside edge-runtime.
				inline: ['convex-test'],
			},
		},
	},
})
