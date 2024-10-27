import type { PageServerLoad, Actions } from './$types';
import { superValidate, message } from 'sveltekit-superforms';
import { fail, error } from '@sveltejs/kit';
import { setSettings, saveSettings, loadSettings } from '$lib/forms/helpers.server';

export const load: PageServerLoad = async ({ fetch, locals }) => {
	console.log("Début du chargement des paramètres partiels...");
	async function getPartialSettings() {
		try {
			const results = await fetch(`${locals.backendUrl}/settings/get`);
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

	const scriptName = 'requis'; 

	return {
		form: data,
		scriptName
	};
};
