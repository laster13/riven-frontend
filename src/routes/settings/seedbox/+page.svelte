<script lang="ts">
	import type { PageData } from './$types';
	import SeedboxForm from '$lib/forms/seedbox-form.svelte';

	export let data: PageData;
</script>

<div class="flex flex-col">
	<h2 class="text-xl font-medium md:text-2xl">General Settings</h2>
	<p class="text-sm text-muted-foreground md:text-base">
		Configure global and default settings for Riven.
	</p>

	<SeedboxForm data={data.form} actionUrl="/settings/seedbox" />
</div>
