import type { PageLoad } from './$types';
import { getCredits, getMovieDetails, getTVDetails } from '$lib/tmdb';

export const load = (async ({ fetch, params }) => {
	const id = String(params.id);
	const mediaType = params.type;

	async function getDetails(id: number, mediaType: string) {
		return await getCredits(fetch, 'fr-FR', id, mediaType);
	}

	async function getMedia(id: string, mediaType: string) {
		switch (mediaType) {
			case 'movie':
				return await getMovieDetails(fetch, 'fr-FR', '', id);
			case 'tv':
				return await getTVDetails(fetch, 'fr-FR', '', id);
		}
	}

	return {
		details: await getDetails(id, mediaType),
		media: await getMedia(id, mediaType)
	};
}) satisfies PageLoad;
