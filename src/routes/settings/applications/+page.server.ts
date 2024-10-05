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
import path from 'path';
import os from 'os';

const userName = os.userInfo().username;

// Chemins des fichiers
const sourceFilePath = `/home/${userName}/seedbox-compose/includes/config/services-available`;
const settingsFilePath = `/home/${userName}/projet-riven/riven-frontend/static/settings.json`;
const servicesFilePath = `/home/${userName}/projet-riven/riven-frontend/static/services.json`;

// Fonction de chargement pour initialiser le formulaire et les items
export const load: PageServerLoad = async ({ fetch, locals }) => {
    console.log('--- Début de la fonction de chargement ---');
    
    // Fonction pour récupérer les paramètres partiels depuis le backend
    async function getPartialSettings() {
        try {
            const results = await fetch(
                `${locals.BACKEND_URL}/settings/get/${applicationsSettingsToGet.join(',')}`
            );

            if (!results.ok) {
                throw new Error('Échec de récupération des paramètres');
            }

            const data = await results.json();
            console.log('--- Données récupérées depuis l\'API :', data);
            return data;
        } catch (e) {
            console.error('--- Erreur lors de la récupération des paramètres :', e);
            throw error(503, 'Unable to fetch settings data. API is down.');
        }
    }

    const data: any = await getPartialSettings();
    const toPassToSchema = applicationsSettingsToPass(data);
    console.log('--- Données après transformation pour le schéma :', toPassToSchema);

    // Données par défaut pour les différentes sections
    let settingsData = [];
    let jsonData = {};
    let authentificationData = {};
    let domaineData = {};
    let plexData = { enabled: false, token: '', login: '', password: '' }; // Ajout de login et password

    try {
        // Lecture du fichier settings.json
        const fileContent = await fs.readFile(settingsFilePath, 'utf-8');
        jsonData = JSON.parse(fileContent);
        settingsData = jsonData.applications || [];
        authentificationData = jsonData.dossiers.authentification || {};
        domaineData = jsonData.dossiers.domaine || {};
        plexData = jsonData.updaters?.plex || { enabled: false, token: '', login: '', password: '' };

        // Assurer que la clé "Basique" est bien définie dans authentification
        if (!authentificationData.authappli) {
            authentificationData.authappli = 'basique'; // Valeur par défaut
        }

        console.log('--- Données récupérées depuis settings.json :', jsonData);
    } catch (error) {
        console.error('--- Erreur lors de la lecture de settings.json, utilisation des valeurs par défaut :', error);
        
        // Initialisation avec des valeurs par défaut si le fichier est manquant ou corrompu
        jsonData = {
            applications: [],
            dossiers: {
                on_item_type: [],
                authentification: {
                    "authappli": "basique" // Valeur par défaut pour authentification
                },
                domaine: {} // Valeur par défaut pour domaine en tant que dictionnaire
            },
            updaters: { // Valeurs par défaut pour Plex
                plex: {
                    token: '',
                    login: '',
                    password: ''
                }
            }
        };
        await fs.writeFile(settingsFilePath, JSON.stringify(jsonData, null, 2), 'utf-8');
        settingsData = jsonData.applications;
        authentificationData = jsonData.dossiers.authentification;
        domaineData = jsonData.dossiers.domaine;
        plexData = jsonData.updaters.plex;
    }

    // Préparation des données initiales du formulaire
    const initialFormData = {
        ...toPassToSchema,
        dossiers_on_item_type: settingsData,
        authentification: authentificationData,
        domaine: domaineData,
        plex_token: plexData.token, // Ajout du plex_token comme chaîne de caractères
        plex_login: plexData.login, // Ajout du plex_login
        plex_password: plexData.password // Ajout du plex_password
    };

    console.log('--- Données initiales pour le formulaire :', initialFormData);

    // Générer les items à partir de la source
    const items = await generateJsonFromSource();

    return {
        form: await superValidate(initialFormData, zod(applicationsSettingsSchema)),
        items
    };
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

        // Extraire et parser le champ __superform_json
        const superformJson = formData.get('__superform_json');
        let parsedSuperform = null;

        try {
            parsedSuperform = JSON.parse(superformJson);  // Parse le JSON string
            console.log('--- Parsed __superform_json :', parsedSuperform);
        } catch (err) {
            console.error('Erreur de parsing du __superform_json:', err);
            return fail(400, { message: 'Erreur de parsing des données du formulaire.' });
        }

        // Rechercher dynamiquement le champ plex_token, plex_login, et plex_password dans parsedSuperform
        const fieldMapping = parsedSuperform[0];  // Premier élément contient le mapping des champs
        const plexTokenIndex = fieldMapping.plex_token;
        const plexLoginIndex = fieldMapping.plex_login;
        const plexPasswordIndex = fieldMapping.plex_password;

        const plex_token = parsedSuperform[plexTokenIndex] || '';  // Utiliser l'indice trouvé dynamiquement
        const plex_login = parsedSuperform[plexLoginIndex] || '';  // Utiliser l'indice trouvé dynamiquement
        const plex_password = parsedSuperform[plexPasswordIndex] || '';  // Utiliser l'indice trouvé dynamiquement

        const selectedItemId = formData.get('selectedItemId');
        const selectedItemLabel = formData.get('selectedItemLabel');
        const authappli = formData.get('authappli');

        console.log('--- Valeurs récupérées :');
        console.log('selectedItemId :', selectedItemId);
        console.log('selectedItemLabel :', selectedItemLabel);
        console.log('authappli :', authappli);
        console.log('plex_token :', plex_token);
        console.log('plex_login :', plex_login);
        console.log('plex_password :', plex_password);

        // Conversion des données du formulaire en objet brut
        const rawFormData = Object.fromEntries(formData);
        console.log('--- Données brutes du formulaire (rawFormData) :', JSON.stringify(rawFormData, null, 2));

        // Gestion du domaine : Rechercher les champs qui commencent par domaine[...]
        let domaine = {};
        for (let key in rawFormData) {
            if (key.startsWith('domaine[')) {
                const domainKey = key.match(/domaine\[(.*?)\]/)[1];
                let domainValue = rawFormData[key];

                // Si la valeur du domaine est vide, attribuer la valeur de selectedItemLabel par défaut
                if (!domainValue || domainValue.trim() === '') {
                    domainValue = selectedItemLabel;
                    console.log(`--- Domaine ${domainKey} a reçu la valeur par défaut : ${domainValue}`);
                }

                domaine[domainKey] = domainValue;
            }
        }
        console.log('--- Domaine après transformation :', JSON.stringify(domaine, null, 2));

        // Validation des données avec Zod
        console.log('--- Début de la validation avec Zod ---');
        const form = await superValidate({
            ...rawFormData,
            id: Number(selectedItemId),
            label: selectedItemLabel,
            domaine,
            plex_token, // Passage explicite du plex_token pour la validation
            plex_login, // Passage explicite du plex_login pour la validation
            plex_password // Passage explicite du plex_password pour la validation
        }, zod(applicationsSettingsSchema));

        console.log('--- Données validées après superValidate :', form);

        if (!form.valid) {
            console.log('--- Formulaire non valide, erreurs :', form.errors);
            return fail(400, { form });
        }
        console.log('--- Formulaire valide après validation avec Zod ---');

        try {
            console.log('--- Récupération des données existantes depuis settings.json ---');

            // Récupération des données existantes depuis settings.json
            let existingApplications = [];
            let existingDossiers = { enabled: false, on_item_type: [], authentification: {}, domaine: {} };
            let existingPlexData = { enabled: false, token: '', login: '', password: '' };

            const existingJsonData = await fs.readFile(settingsFilePath, 'utf-8');
            const parsedData = JSON.parse(existingJsonData);

            existingApplications = parsedData.applications || [];
            existingDossiers = parsedData.dossiers || { enabled: false, on_item_type: [], authentification: {}, domaine: {} };
            existingPlexData = parsedData.updaters?.plex || { enabled: false, token: '', login: '', password: '' };

            console.log('--- Données existantes récupérées :');
            console.log('Applications :', existingApplications);
            console.log('Dossiers :', existingDossiers);
            console.log('Plex Data :', existingPlexData);

            // Mise à jour des applications et des dossiers
            if (!existingDossiers.on_item_type.includes(selectedItemLabel)) {
                existingDossiers.on_item_type.push(selectedItemLabel);
                console.log('--- Application ajoutée à on_item_type :', selectedItemLabel);
            }

            // Mise à jour des authentifications et du domaine
            // Mise à jour des authentifications
            existingDossiers.authentification[selectedItemLabel] = authappli ?? 'Basique';
            existingDossiers.domaine = { ...existingDossiers.domaine, ...domaine };
            console.log('--- Authentification mise à jour :', existingDossiers.authentification);
            console.log('--- Domaine mis à jour :', existingDossiers.domaine);

            // Mise à jour des données Plex
            existingPlexData = {
                token: plex_token,
                login: plex_login,
                password: plex_password
            };
            console.log('--- Plex Data mis à jour :', existingPlexData);

            const newApplication = { id: selectedItemId, label: selectedItemLabel };
            if (!existingApplications.find(app => app.label === selectedItemLabel)) {
                existingApplications.push(newApplication);
                console.log('--- Nouvelle application ajoutée :', newApplication);
            }

            // Sauvegarde des nouvelles données dans settings.json
            console.log('--- Sauvegarde des nouvelles données dans settings.json ---');
            await fs.writeFile(settingsFilePath, JSON.stringify({
                applications: existingApplications,
                dossiers: existingDossiers,
                updaters: { plex: existingPlexData }
            }, null, 2), 'utf-8');

            // Génération des nouveaux items dans services.json
            console.log('--- Génération des nouveaux items dans services.json ---');
            await generateJsonFromSource();

            // Envoi des données mises à jour au backend
            console.log('--- Envoi des données mises à jour au backend ---');
            const toSet = [
                { key: 'applications', value: existingApplications },
                { key: 'dossiers', value: existingDossiers },
                { key: 'updaters', value: { plex: existingPlexData } }
            ];
            const data = await setSettings(event.fetch, toSet);
            console.log('--- Réponse du backend reçue :', JSON.stringify(data, null, 2));

            if (!data.data.success) {
                console.log('--- Échec de l\'initialisation des services ---');
                return fail(400, { form, message: 'Échec de l\'initialisation des services.' });
            }

            console.log('--- Services initialisés avec succès ---');

            // Sauvegarder et charger les nouvelles données
            await saveSettings(event.fetch);
            await loadSettings(event.fetch);

        } catch (err) {
            console.error('--- Erreur lors du traitement des données :', err);
            return fail(500, { form, message: `Erreur: ${err.message}` });
        }

        console.log('--- Fin de l\'action par défaut ---');
    }
};
