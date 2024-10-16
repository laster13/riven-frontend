<script lang="ts">
	import type { PageData } from './$types';
	import ZurgForm from '$lib/forms/zurg-form.svelte';

	export let data: PageData;
</script>

<div class="flex flex-col">
	<h2 class="text-xl font-medium md:text-2xl">Paramètres généraux</h2>
	<p class="text-sm text-muted-foreground md:text-base">
		Configuration zurg.
	</p>

	<ZurgForm data={data.form} actionUrl="/settings/zurg" />
</div>
