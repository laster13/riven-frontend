import type { PageServerLoad, Actions } from './$types';
import { superValidate, message } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { fail, error, redirect } from '@sveltejs/kit';
import {
	zurgSettingsSchema,
	zurgSettingsToGet,
	zurgSettingsToPass,
	zurgSettingsToSet
} from '$lib/forms/helpers';
import { setSettings, saveSettings, loadSettings } from '$lib/forms/helpers.server';

export const load: PageServerLoad = async ({ fetch, locals }) => {
	async function getPartialSettings() {
		try {
			const results = await fetch(
				`${locals.BACKEND_URL}/settings/get/${zurgSettingsToGet.join(',')}`
			);
			return await results.json();
		} catch (e) {
			console.error(e);
			error(503, 'Unable to fetch settings data. API is down.');
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const data: any = await getPartialSettings();
	const toPassToSchema = zurgSettingsToPass(data);


	return {
		form: await superValidate(toPassToSchema, zod(zurgSettingsSchema))
	};
};

export const actions: Actions = {
	default: async (event) => {
		const form = await superValidate(event, zod(zurgSettingsSchema));

		if (!form.valid) {
			console.log('form not valid');
			return fail(400, {
				form
			});
		}
		const toSet = zurgSettingsToSet(form);

		try {
			const data = await setSettings(event.fetch, toSet);
			if (!data.data.success) {
				return message(form, `Service(s) failed to initialize. Please check your settings.`, {
					status: 400
				});
			}
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const _save = await saveSettings(event.fetch);
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const _load = await loadSettings(event.fetch);
		} catch (e) {
			console.error(e);
			return message(form, 'Unable to save settings. API is down.', {
				status: 400
			});
		}

		return message(form, 'Settings saved!');
	}
};
