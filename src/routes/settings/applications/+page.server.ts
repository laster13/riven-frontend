// src/routes/settings/applications/+page.server.ts

import type { PageServerLoad, Actions } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { fail, error } from '@sveltejs/kit';
import {
    applicationsSettingsSchema,
    applicationsSettingsToGet,
    applicationsSettingsToPass,
    applicationsSettingsToSet
} from '$lib/forms/helpers';
import { setSettings, saveSettings, loadSettings } from '$lib/forms/helpers.server';
import fs from 'fs/promises';
import os from 'os';
import { SettingsService } from '$lib/client';

const userName = os.userInfo().username;
const settingsFilePath = `/home/${userName}/projet-riven/riven-frontend/static/settings.json`;

export const load: PageServerLoad = async ({ fetch }) => {
    console.log('--- Début de la fonction de chargement ---');

    try {
        // Récupération des paramètres depuis l'API principale
        const response = await SettingsService.getSettings({
            path: {
                paths: ['dossiers', 'applications']
            }
        });

        const data = response?.data ?? {};
        console.log('Données récupérées depuis l\'API :', data);

        const toPassToSchema = applicationsSettingsToPass({
            ...data,
            dossiers: data.dossiers || { on_item_type: [], authentification: {}, domaine: {} }
        });

        let settingsData = [];
        let authentificationData = {};
        let domaineData = {};

        try {
            const fileContent = await fs.readFile(settingsFilePath, 'utf-8');
            const jsonData = JSON.parse(fileContent);

            settingsData = jsonData.applications || [];
            authentificationData = jsonData.dossiers?.authentification || {};
            domaineData = jsonData.dossiers?.domaine || {};

            if (!authentificationData.authappli) {
                authentificationData.authappli = 'basique';
            }

            console.log('--- Données récupérées depuis settings.json :', jsonData);
        } catch (error) {
            console.error('--- Erreur lors de la lecture de settings.json, utilisation des valeurs par défaut :', error);

            const defaultData = {
                applications: [],
                dossiers: {
                    on_item_type: [],
                    authentification: { "authappli": "basique" },
                    domaine: {}
                }
            };
            await fs.writeFile(settingsFilePath, JSON.stringify(defaultData, null, 2), 'utf-8');
            settingsData = defaultData.applications;
            authentificationData = defaultData.dossiers.authentification;
            domaineData = defaultData.dossiers.domaine;
        }

        // Récupération des items depuis l'API /settings/services.json
        const servicesResponse = await fetch('/settings/services.json');
        let items = [];
        if (servicesResponse.ok) {
            const servicesData = await servicesResponse.json();
            items = servicesData.items || [];
            console.log('--- Items récupérés depuis /settings/services.json :', items);
        } else {
            console.error('Erreur lors de la récupération des items depuis /settings/services.json');
        }

        const initialFormData = {
            ...toPassToSchema,
            dossiers_on_item_type: settingsData,
            authentification: authentificationData,
            domaine: domaineData
        };

        console.log('--- Données initiales pour le formulaire :', initialFormData);

        const form = await superValidate(initialFormData, zod(applicationsSettingsSchema));

        return { form, items };
    } catch (e) {
        console.error('Erreur lors de la récupération des paramètres:', e);
        throw error(503, 'Unable to fetch settings data. API is down.');
    }
};

async function generateJsonFromSource() {
    console.log('--- Début de la génération des items ---');
    const response = await fetch('/settings/services.json');
    if (!response.ok) throw new Error('Échec de récupération des services via l’API');
    const jsonData = await response.json();
    console.log('--- Items générés :', jsonData.items);
    return jsonData.items || [];
}

// Action pour gérer la soumission du formulaire
export const actions: Actions = {
    default: async (event) => {
        console.log('--- Début de l\'action par défaut ---');
        const formData = await event.request.formData();
        const selectedItemId = formData.get('selectedItemId');
        const selectedItemLabel = formData.get('selectedItemLabel');
        const authappli = formData.get('authappli');

        const rawFormData = Object.fromEntries(formData);
        let domaine = {};
        for (let key in rawFormData) {
            if (key.startsWith('domaine[')) {
                const domainKey = key.match(/domaine\[(.*?)\]/)[1];
                let domainValue = rawFormData[key];
                domaine[domainKey] = domainValue || selectedItemLabel;
            }
        }

        const form = await superValidate({
            ...rawFormData,
            id: Number(selectedItemId),
            label: selectedItemLabel,
            domaine
        }, zod(applicationsSettingsSchema));

        if (!form.valid) {
            return fail(400, { form });
        }

        try {
            const existingJsonData = await fs.readFile(settingsFilePath, 'utf-8');
            const parsedData = JSON.parse(existingJsonData);

            let existingApplications = parsedData.applications || [];
            let existingDossiers = parsedData.dossiers || { on_item_type: [], authentification: {}, domaine: {} };

            if (!existingDossiers.on_item_type.includes(selectedItemLabel)) {
                existingDossiers.on_item_type.push(selectedItemLabel);
            }
            existingDossiers.authentification[selectedItemLabel] = authappli || 'Basique';
            existingDossiers.domaine = { ...existingDossiers.domaine, ...domaine };

            const newApplication = { id: selectedItemId, label: selectedItemLabel };
            if (!existingApplications.some(app => app.label === selectedItemLabel)) {
                existingApplications.push(newApplication);
            }

            await fs.writeFile(settingsFilePath, JSON.stringify({
                applications: existingApplications,
                dossiers: existingDossiers
            }, null, 2), 'utf-8');

            const toSet = [
                { key: 'applications', value: existingApplications },
                { key: 'dossiers', value: existingDossiers }
            ];
            const data = await SettingsService.setSettings({ body: toSet });

            if (!data?.data?.message || data.data.message !== 'Settings updated successfully.') {
                return fail(400, { form, message: 'Échec de l\'initialisation des services.' });
            }

            await saveSettings(event.fetch);
            await loadSettings(event.fetch);
        } catch (err) {
            console.error('--- Erreur lors du traitement des données :', err);
            return fail(500, { form, message: `Erreur: ${err.message}` });
        }
        console.log('--- Fin de l\'action par défaut ---');
    }
};