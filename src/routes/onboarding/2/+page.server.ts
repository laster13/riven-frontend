import type { PageServerLoad, Actions } from './$types';
import { superValidate, message } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { fail, error, redirect } from '@sveltejs/kit';
import {
    seedboxSettingsSchema,
    seedboxSettingsToGet,
    seedboxSettingsToPass,
    seedboxSettingsToSet
} from '$lib/forms/helpers';
import { setSettings, saveSettings, loadSettings } from '$lib/forms/helpers.server';

export const load: PageServerLoad = async ({ fetch, locals }) => {
    async function getPartialSettings() {
        try {
            const results = await fetch(
                `${locals.BACKEND_URL}/settings/get/${seedboxSettingsToGet.join(',')}`
            );
            return await results.json();
        } catch (e) {
            console.error(e);
            throw error(503, 'Unable to fetch settings data. API is down.');
        }
    }

    const data: any = await getPartialSettings();
    const toPassToSchema = seedboxSettingsToPass(data);
    const scriptName = 'appli'; 


    return {
        form: await superValidate(toPassToSchema, zod(seedboxSettingsSchema)),
	scriptName

    };
};

