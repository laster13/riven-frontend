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

// Chemins des fichiers
const sourceFilePath = `/home/${userName}/seedbox-compose/includes/config/services-available`;
const settingsFilePath = `/home/${userName}/projet-riven/riven-frontend/static/settings.json`;
const servicesFilePath = `/home/${userName}/projet-riven/riven-frontend/static/services.json`;

// Fonction de chargement pour initialiser le formulaire et les items
export const load: PageServerLoad = async () => {
    console.log('--- Début de la fonction de chargement ---');

    try {
        // Récupération des paramètres depuis l'API
        const response = await SettingsService.getSettings({
            path: {
                paths: ['dossiers', 'applications', 'symlink', 'downloaders', 'scraping']
            }
        });

        const data = response?.data ?? {};
        console.log('Données récupérées depuis l\'API :', data);

        const realdebridPath = data.downloaders.real_debrid?.api_key || '';
        const alldebridPath = data.downloaders.all_debrid?.api_key || '';
        const zileanPath = data.scraping.zilean?.url || '';
        const yggflixPath = data.scraping.yggflix?.ygg_passkey || '';
        const tmdbPath = data.scraping.yggflix?.tmdb_api_key || '';
        const secretPath = data.scraping.yggflix?.secret_api_key || '';

        // Préparer les autres sections pour éviter les erreurs de structure
        const toPassToSchema = applicationsSettingsToPass({
            ...data,
            dossiers: data.dossiers || { on_item_type: [], authentification: {}, domaine: {} }
        });

        let settingsData = [];
        let authentificationData = {};
        let domaineData = {};

        try {
            // Lecture du fichier settings.json
            const fileContent = await fs.readFile(settingsFilePath, 'utf-8');
            const jsonData = JSON.parse(fileContent);

            settingsData = jsonData.applications || [];
            authentificationData = jsonData.dossiers?.authentification || {};
            domaineData = jsonData.dossiers?.domaine || {};

            // Assurer que "authappli" est bien définie dans authentification
            if (!authentificationData.authappli) {
                authentificationData.authappli = 'basique';
            }

            console.log('--- Données récupérées depuis settings.json :', jsonData);
        } catch (error) {
            console.error('--- Erreur lors de la lecture de settings.json, utilisation des valeurs par défaut :', error);

            // Initialisation avec des valeurs par défaut si le fichier est manquant ou corrompu
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

        // Préparation des données initiales du formulaire
        const initialFormData = {
            ...toPassToSchema,
            dossiers_on_item_type: settingsData,
            authentification: authentificationData,
            domaine: domaineData,
            realdebrid_api_key: realdebridPath,
            alldebrid_api_key: alldebridPath,
            zilean_url: zileanPath, 
            yggflix_ygg_passkey: yggflixPath, 
            yggflix_tmdb_api_key: tmdbPath,
            yggflix_secret_api_key: secretPath,
        };

        console.log('--- Données initiales pour le formulaire :', initialFormData);

        // Initialisation du formulaire avec superValidate
        const form = await superValidate(initialFormData, zod(applicationsSettingsSchema));
        const items = await generateJsonFromSource();

        return { form, items };
    } catch (e) {
        console.error('Erreur lors de la récupération des paramètres:', e);
        throw error(503, 'Unable to fetch settings data. API is down.');
    }
};

// Fonction pour générer les items à partir de la source
async function generateJsonFromSource() {
    console.log('--- Début de la génération des items ---');
    try {
        const fileContent = await fs.readFile(sourceFilePath, 'utf-8');
        const lines = fileContent.split('\n');
        const firstWords = lines
            .map(line => line.trim().split(' ')[0])
            .filter(word => word.length > 0);

        const items = firstWords.map((word, index) => ({
            id: index,
            label: word
        }));

        console.log('--- Items générés :', items);
        await fs.writeFile(servicesFilePath, JSON.stringify({ items }, null, 2), 'utf-8');
        return items;
    } catch (error) {
        console.error('--- Erreur lors de la génération des items:', error);
        return [];
    }
}
// Action pour gérer la soumission du formulaire
export const actions: Actions = {
    default: async (event) => {
        console.log('--- Début de l\'action par défaut ---');

        // Récupération des données du formulaire
        const formData = await event.request.formData();
        console.log('--- Données du formulaire reçues :', Object.fromEntries(formData.entries()));

        const selectedItemId = formData.get('selectedItemId');
        const selectedItemLabel = formData.get('selectedItemLabel');
        const authappli = formData.get('authappli');

        console.log('--- Valeurs récupérées :');
        console.log('selectedItemId :', selectedItemId);
        console.log('selectedItemLabel :', selectedItemLabel);
        console.log('authappli :', authappli);

        const rawFormData = Object.fromEntries(formData);
        console.log('--- Données brutes du formulaire (rawFormData) :', JSON.stringify(rawFormData, null, 2));

        let domaine = {};
        for (let key in rawFormData) {
            if (key.startsWith('domaine[')) {
                const domainKey = key.match(/domaine\[(.*?)\]/)[1];
                let domainValue = rawFormData[key];

                if (!domainValue || domainValue.trim() === '') {
                    domainValue = selectedItemLabel;
                    console.log(`--- Domaine ${domainKey} a reçu la valeur par défaut : ${domainValue}`);
                }

                domaine[domainKey] = domainValue;
            }
        }
        console.log('--- Domaine après transformation :', JSON.stringify(domaine, null, 2));

        const form = await superValidate({
            ...rawFormData,
            id: Number(selectedItemId),
            label: selectedItemLabel,
            domaine
        }, zod(applicationsSettingsSchema));

        console.log('--- Données validées après superValidate :', form);

        if (!form.valid) {
            console.log('--- Formulaire non valide, erreurs :', form.errors);
            return fail(400, { form });
        }
        console.log('--- Formulaire valide après validation avec Zod ---');

        try {
            console.log('--- Récupération des données existantes depuis settings.json ---');

            let existingApplications = [];
            let existingDossiers = { on_item_type: [], authentification: {}, domaine: {} };

            const existingJsonData = await fs.readFile(settingsFilePath, 'utf-8');
            const parsedData = JSON.parse(existingJsonData);

            existingApplications = parsedData.applications || [];
            existingDossiers = parsedData.dossiers || { on_item_type: [], authentification: {}, domaine: {} };

            console.log('--- Données existantes récupérées :');
            console.log('Applications :', existingApplications);
            console.log('Dossiers :', existingDossiers);

            if (!existingDossiers.on_item_type.includes(selectedItemLabel)) {
                existingDossiers.on_item_type.push(selectedItemLabel);
                console.log('--- Application ajoutée à on_item_type :', selectedItemLabel);
            }

            existingDossiers.authentification[selectedItemLabel] = authappli ?? 'Basique';
            existingDossiers.domaine = { ...existingDossiers.domaine, ...domaine };
            console.log('--- Authentification mise à jour :', existingDossiers.authentification);
            console.log('--- Domaine mis à jour :', existingDossiers.domaine);

            const newApplication = { id: selectedItemId, label: selectedItemLabel };
            if (!existingApplications.find(app => app.label === selectedItemLabel)) {
                existingApplications.push(newApplication);
                console.log('--- Nouvelle application ajoutée :', newApplication);
            }

            console.log('--- Sauvegarde des nouvelles données dans settings.json ---');
            await fs.writeFile(settingsFilePath, JSON.stringify({
                applications: existingApplications,
                dossiers: existingDossiers
            }, null, 2), 'utf-8');

            // await generateJsonFromSource();

            console.log('--- Envoi des données mises à jour au backend ---');
const toSet = [
    { key: 'applications', value: existingApplications },
    { key: 'dossiers', value: existingDossiers }
];
const data = await SettingsService.setSettings({ body: toSet });
console.log('--- Réponse du backend reçue :', JSON.stringify(data, null, 2));

// Vérification de la présence du message de succès dans la réponse
if (!data?.data?.message || data.data.message !== 'Settings updated successfully.') {
    console.log('--- Échec de l\'initialisation des services ---');
    return fail(400, { form, message: 'Échec de l\'initialisation des services.' });
}

console.log('--- Services initialisés avec succès ---');
    await saveSettings(event.fetch);
    await loadSettings(event.fetch);

} catch (err) {
    console.error('--- Erreur lors du traitement des données :', err);
    return fail(500, { form, message: `Erreur: ${err.message}` });
}
        console.log('--- Fin de l\'action par défaut ---');
    }
};
