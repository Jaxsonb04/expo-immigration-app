import { createFormHook } from '@tanstack/react-form'
import DateField from './form.date-field'
import NumberField from './form.number-field'
import RadioGroupField from './form.radio-group-field'
import SelectField from './form.select-field'
import SubmitButton from './form.submit-button'
import SwitchField from './form.switch-field'
import TextAreaField from './form.text-area-field'
import TextField from './form.text-field'
import { fieldContext, formContext } from './form.context'

// The app's TanStack Form hook, pre-wired with HeroUI-Native field components.
// Add new field types to `fieldComponents` and they become available as
// `field.<Name>` inside `form.AppField` render props (and inside field groups).
export const { useAppForm, withForm, withFieldGroup } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		TextField,
		TextAreaField,
		SelectField,
		RadioGroupField,
		NumberField,
		DateField,
		SwitchField,
	},
	formComponents: {
		SubmitButton,
	},
})
