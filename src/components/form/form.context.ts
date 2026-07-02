import { createFormHookContexts } from '@tanstack/react-form'

// Shared field/form contexts that bind the custom field components below to a
// TanStack `useAppForm` instance. Created once and consumed by both the field
// components (via `useFieldContext`) and `createFormHook` (in ./form.ts).
export const { fieldContext, formContext, useFieldContext, useFormContext } =
	createFormHookContexts()
