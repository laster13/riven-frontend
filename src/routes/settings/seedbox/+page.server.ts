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

export const actions: Actions = {
    default: async (event) => {
        const form = await superValidate(event, zod(seedboxSettingsSchema));
        console.log('Formulaire validé par superValidate:', form);

        if (!form.valid) {
            console.log('form not valid');
            return fail(400, {
                form
            });
        }
        const toSet = seedboxSettingsToSet(form);

        try {
            const data = await setSettings(toSet);
            if (!data) {
                return message(form, 'Service(s) failed to initialize. Please check your settings.', {
                    status: 400
                });
            }

            const _save = await saveSettings();
            const _load = await loadSettings();
        } catch (e) {
            console.error(e);
            return message(form, 'Unable to save settings. API is down.', {
                status: 400
            });
        }

        if (event.url.searchParams.get('onboarding') === 'true') {
            throw redirect(302, '/onboarding/3');
        }

        return message(form, 'Settings saved!');
    }
};
