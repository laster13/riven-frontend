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
        const scriptName = 'zurg';

	return {
		form: await superValidate(toPassToSchema, zod(zurgSettingsSchema)),
                scriptName
	};
};

