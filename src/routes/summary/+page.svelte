<script lang="ts">
	import type { PageData } from './$types';
	import Header from '$lib/components/header.svelte';
	import * as Card from '$lib/components/ui/card';
	import { clsx } from 'clsx';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		statesName,
		servicesObject,
		coreServices,
		downloaderServices,
		contentServices,
		scrapingServices
	} from '$lib/constants';

	export let data: PageData;

	const statsData: { title: string; value: number; refTo: string }[] = [
		{
			title: 'Total Medias',
			value: data.stats?.total_items || 0,
			refTo: '/browse'
		},
		{
			title: 'Total Films',
			value: data.stats?.total_movies || 0,
			refTo: '/browse?type=movie'
		},
		{
			title: 'Total Séries',
			value: data.stats?.total_shows || 0,
			refTo: '/browse?type=show'
		},
		{
			title: 'Medias incomplets',
			value: data.stats?.incomplete_items || 0,
			refTo:
				'/browse?state=Unknown%2CRequested%2CIndexed%2CScraped%2CDownloaded%2CSymlinked%2CFailed%2CPartiallyCompleted'
		}
	];

	function sortServices(
		services: string[],
		data?: Record<string, boolean>
	): Record<string, boolean> {
		if (!data) {
			const sortedData = {} as Record<string, boolean>;
			services.forEach((service) => {
				sortedData[service] = false;
			});
			return sortedData;
		}
		let sortedData = {} as Record<string, boolean>;

		for (let service of services) {
			sortedData[service] = data[service];
			if (!data[service]) {
				data[service] = false;
			}
		}
		return sortedData as Record<string, boolean>;
	}

	const coreServicesData = sortServices(coreServices, data.services);
	const downloaderServicesData = sortServices(downloaderServices, data.services);
	const contentServicesData = sortServices(contentServices, data.services);
	const scrapingServicesData = sortServices(scrapingServices, data.services);

	const coreServicesStatus = Object.keys(coreServicesData).map((service) => {
		return {
			name: servicesObject[service],
			status: coreServicesData[service]
		};
	});

	const downloaderServicesStatus = Object.keys(downloaderServicesData).map((service) => {
		return {
			name: servicesObject[service],
			status: downloaderServicesData[service]
		};
	});

	const contentServicesStatus = Object.keys(contentServicesData).map((service) => {
		return {
			name: servicesObject[service],
			status: contentServicesData[service]
		};
	});

	const scrapingServicesStatus = Object.keys(scrapingServicesData).map((service) => {
		return {
			name: servicesObject[service],
			status: scrapingServicesData[service]
		};
	});

	type ServiceStatus = {
		name: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		services: any;
	};

	const servicesStatus: ServiceStatus[] = [
		{
			name: 'Services principaux',
			services: coreServicesStatus
		},
		{
			name: 'Services de téléchargement',
			services: downloaderServicesStatus
		},
		{
			name: 'Services de contenu',
			services: contentServicesStatus
		},
		{
			name: 'Services de scraping',
			services: scrapingServicesStatus
		}
	];
</script>

<svelte:head>
	<title>Summary | Riven</title>
</svelte:head>

<Header />

<div class="mt-32 flex w-full flex-col p-8 md:px-24 lg:px-32">
	<h2 class="text-xl md:text-2xl">Statistics</h2>
	<p class="text-sm text-muted-foreground lg:text-base">Statistics of the library</p>
	<div class="mt-4 grid w-full grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
		{#each statsData as stat}
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm font-medium lg:text-base">{stat.title}</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if stat.title === 'Total Shows'}
						<p class="text-lg lg:text-3xl">{stat.value}</p>
						<p class="text-sm text-muted-foreground lg:text-base">
							{data.stats?.total_seasons || 0} Seasons
						</p>
						<p class="text-sm text-muted-foreground lg:text-base">
							{data.stats?.total_episodes || 0} Episodes
						</p>
					{:else}
						<p class="text-lg lg:text-3xl">{stat.value}</p>
					{/if}
					<a href={stat.refTo} class="text-sm text-muted-foreground"> Voir les Medias </a>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<h2 class="mt-12 text-xl md:text-2xl">Services</h2>
	<p class="text-sm text-muted-foreground lg:text-base">Indique l'état actuel des services</p>
	<div class="mt-4 grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
		{#each servicesStatus as service}
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm font-medium lg:text-base">{service.name}</Card.Title>
				</Card.Header>
				<Card.Content>
					{#each service.services as status}
						<div class="flex items-center gap-2">
							<span
								class={clsx('h-3 w-3 rounded-full', {
									'bg-green-500': status.status,
									'bg-red-500': !status.status
								})}
							></span>
							<p class="text-sm lg:text-base">{status.name}</p>
						</div>
					{/each}
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<h2 class="mt-12 text-xl md:text-2xl">Etat</h2>
	<p class="text-sm text-muted-foreground lg:text-base">
		Indique l'état actuel des éléments dans la bibliothèque
	</p>
	<Dialog.Root>
		<Dialog.Trigger class="flex w-full max-w-max items-start text-muted-foreground underline">
			En savoir plus sur les états
		</Dialog.Trigger>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>What are these states?</Dialog.Title>
				<Dialog.Description class="flex flex-col gap-2">
					<p>
						Riven has items, which are movies/shows/season/episode. These items go through different
						states.
					</p>
					<p>
						States represent how the items are processed in the library. Each state represents a
						different stage of the item in the library. Items start Requested and end up in
						Completed state. Sometimes due to ongoing series, no streams or some error, they can end
						up in Incomplete or Failed state. Rarely items end up in Unknown state.
					</p>
				</Dialog.Description>
			</Dialog.Header>
		</Dialog.Content>
	</Dialog.Root>

	{#if data.stats?.states}
		<div class="mb-16 mt-4 grid w-full grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
			{#each Object.keys(data.stats.states) as state}
				<Card.Root
					class={clsx({
						'col-span-2': state === 'Completed'
					})}
				>
					<Card.Header>
						<Card.Title class="text-sm font-medium lg:text-base">{statesName[state]}</Card.Title>
					</Card.Header>
					<Card.Content>
						<p class="text-lg lg:text-3xl">{data.stats.states[state]}</p>
						<a href={`/browse?states=${state}`} class="text-sm text-muted-foreground">
							Voir les Medias
						</a>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
