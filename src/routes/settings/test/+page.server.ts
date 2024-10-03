import type { PageServerLoad, Actions } from './$types';
import { superValidate, message } from 'sveltekit-superforms';
import { fail, error } from '@sveltejs/kit';
import { setSettings, saveSettings, loadSettings } from '$lib/forms/helpers.server';

// Validation simple sans zod
function validateForm(data: any) {
	const errors: Record<string, string> = {};
	let valid = true;

	// Exemple de validation basique
	if (!data.setting1 || data.setting1 === '') {
		errors.setting1 = 'Setting 1 is required';
		valid = false;
	}

	if (!data.setting2 || data.setting2 === '') {
		errors.setting2 = 'Setting 2 is required';
		valid = false;
	}

	// Vous pouvez ajouter d'autres validations selon vos besoins

	return { valid, errors };
}

export const load: PageServerLoad = async ({ fetch, locals }) => {
	console.log("Début du chargement des paramètres partiels...");

	// Fonction pour obtenir les paramètres directement
	async function getPartialSettings() {
		try {
			const results = await fetch(`${locals.BACKEND_URL}/settings/get`);
			console.log('Réponse obtenue depuis le backend:', results);
			return await results.json();
		} catch (e) {
			console.error('Erreur lors de la récupération des paramètres:', e);
			throw error(503, 'Unable to fetch settings data. API is down.');
		}
	}

	// Récupérer les données depuis l'API sans transformation
	const data: any = await getPartialSettings();
	console.log('Données reçues pour le formulaire :', data);

	const scriptName = 'webui'; 

	return {
		form: data, // On passe directement les données récupérées sans transformation
		scriptName
	};
};

export const actions: Actions = {
	default: async (event) => {
		console.log("Début de l'action par défaut...");

		const formData = await event.request.formData();
		const formObject = Object.fromEntries(formData);

		// Utilisation de la fonction de validation personnalisée
		const { valid, errors } = validateForm(formObject);
		console.log("Formulaire validé :", { valid, errors });

		if (!valid) {
			console.log('Formulaire non valide:', errors);
			return fail(400, { form: formObject, errors });
		}

		// On envoie directement les données du formulaire au backend
		try {
			const data = await setSettings(event.fetch, formObject);
			console.log('Réponse du backend après la mise à jour des paramètres:', data);

			if (!data.data.success) {
				console.log('Échec lors de l\'initialisation des services:', data);
				return message(formObject, `Service(s) failed to initialize. Please check your settings.`, { status: 400 });
			}

			await saveSettings(event.fetch);
			await loadSettings(event.fetch);
			console.log('Paramètres sauvegardés et chargés avec succès');

		} catch (e) {
			console.error('Erreur lors de la sauvegarde des paramètres:', e);
			return message(formObject, 'Unable to save settings. API is down.', { status: 400 });
		}
	}
};
