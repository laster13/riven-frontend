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
import { SettingsService } from '$lib/client';

export const load: PageServerLoad = async () => {
    try {
        const { data } = await SettingsService.getSettings({
            path: {
                paths: seedboxSettingsToGet.join(',')
            }
        });
        const toPassToSchema = seedboxSettingsToPass(data);
        console.log('Données après passage dans seedboxSettingsToPass:', toPassToSchema);

        return {
            form: await superValidate(toPassToSchema, zod(seedboxSettingsSchema)),
            scriptName: 'infos'  // Ajout de scriptName comme dans l'ancien fichier
        };
    } catch (e) {
        console.error(e);
        throw error(503, 'Unable to fetch settings data. API is down.');
    }
};
