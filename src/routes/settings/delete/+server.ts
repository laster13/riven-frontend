import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import os from 'os';

const userName = os.userInfo().username;

// Chemins des fichiers
const settingsFilePath = `/home/${userName}/projet-riven/riven-frontend/static/settings.json`;
const localSettingsFilePath = `/home/${userName}/projet-riven/riven/data/settings.json`;
const servicesFilePath = `/home/${userName}/projet-riven/riven-frontend/static/services.json`;
const sourceFilePath = `/home/${userName}/seedbox-compose/includes/config/services-available`;

// Fonction pour générer les items à partir de la source
async function generateJsonFromSource() {
    console.log('--- Démarrage de la fonction generateJsonFromSource ---');
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
        console.log('Nouveaux items générés:', items);

        await fs.writeFile(servicesFilePath, JSON.stringify({ items }, null, 2), 'utf-8');
        console.log(`Fichier ${servicesFilePath} mis à jour avec succès.`);
        return items;
    } catch (error) {
        console.error('Erreur lors de la génération des items depuis la source:', error);
        return [];
    }
}

// Fonction pour mettre à jour les fichiers settings.json local et static
async function updateSettingsFiles(updatedApplications: any[], updatedDossiers: any) {
    try {
        const staticSettings = JSON.parse(await fs.readFile(settingsFilePath, 'utf-8'));
        staticSettings.applications = updatedApplications;
        staticSettings.dossiers = updatedDossiers;

        await fs.writeFile(settingsFilePath, JSON.stringify(staticSettings, null, 2), 'utf-8');
        console.log("Fichier /static/settings.json mis à jour avec succès.");
    } catch (error) {
        console.error('Erreur lors de la mise à jour de /static/settings.json:', error);
        throw new Error('Failed to update static settings file.');
    }

    try {
        const localSettings = JSON.parse(await fs.readFile(localSettingsFilePath, 'utf-8'));
        localSettings.applications = updatedApplications;
        localSettings.dossiers = updatedDossiers;

        await fs.writeFile(localSettingsFilePath, JSON.stringify(localSettings, null, 2), 'utf-8');
        console.log("Fichier settings.local.json mis à jour avec succès.");
    } catch (error) {
        console.error('Erreur lors de la mise à jour de settings.local.json:', error);
        throw new Error('Failed to update local settings file.');
    }
}

// Fonction pour supprimer une application ou domaine en fonction du label
export async function DELETE({ url }: { url: URL }) {
    console.log('--- Début de la gestion de l\'action DELETE ---');

    const settingLabel = url.searchParams.get('setting_id');
    console.log(`Requête pour supprimer l'application ou le domaine avec le label: ${settingLabel}`);
    if (!settingLabel) {
        console.log('Label de suppression manquant.');
        return json({ message: 'Missing setting_id parameter.' }, { status: 400 });
    }

    try {
        let existingApplications = [];
        let existingDossiers = { on_item_type: [], authentification: {}, domaine: {} };
        try {
            console.log(`Lecture du fichier ${settingsFilePath} pour les données existantes...`);
            const existingJsonData = await fs.readFile(settingsFilePath, 'utf-8');
            const parsedData = JSON.parse(existingJsonData);
            existingApplications = parsedData.applications || [];
            existingDossiers = parsedData.dossiers || { on_item_type: [], authentification: {}, domaine: {} };
            console.log('Données existantes chargées:', { existingApplications, existingDossiers });
        } catch (error) {
            console.error('Erreur lors de la lecture des données existantes:', error);
            return json({ message: 'Error reading existing data.' }, { status: 500 });
        }

        // Vérifier que domaine existe avant de tenter de le supprimer
        if (existingDossiers.domaine && existingDossiers.domaine[settingLabel]) {
            console.log(`Domaine trouvé pour ${settingLabel}, suppression en cours...`);
            delete existingDossiers.domaine[settingLabel];
            console.log(`Domaine supprimé pour ${settingLabel}.`);
        } else {
            console.log(`Domaine non trouvé pour ${settingLabel}, rien à supprimer.`);
        }

        // Filtrer les applications pour supprimer celle avec le label spécifié
        const updatedApplications = existingApplications.filter(app => app.label !== settingLabel);
        console.log('Applications après suppression:', updatedApplications);

        // Mettre à jour on_item_type
        const updatedDossiersOnItemType = existingDossiers.on_item_type.filter(label => label !== settingLabel);
        existingDossiers.on_item_type = updatedDossiersOnItemType;

        // Supprimer l'authentification correspondante
        if (existingDossiers.authentification && existingDossiers.authentification[settingLabel]) {
            delete existingDossiers.authentification[settingLabel];
            console.log(`Authentification supprimée pour ${settingLabel}.`);
        } else {
            console.log(`Authentification non trouvée pour ${settingLabel}.`);
        }

        console.log('Dossiers mis à jour:', existingDossiers);

        // Mettre à jour les fichiers settings.json (static) et settings.local.json (local)
        await updateSettingsFiles(updatedApplications, existingDossiers);

        // Régénérer le fichier services.json après la mise à jour de settings.json
        await generateJsonFromSource();

        console.log('Paramètres sauvegardés avec succès.');
        return json({ message: 'Settings deleted successfully.' });
    } catch (e) {
        console.error('Erreur lors de la suppression des paramètres:', e);
        return json({ message: `Erreur: ${e.message}` }, { status: 500 });
    }
}
