<script lang="ts">
	import type { PageData } from './$types';
	import TestForm from '$lib/forms/test-form.svelte';

	export let data: PageData;
</script>

<div class="flex flex-col">
	<h2 class="text-xl font-medium md:text-2xl">Paramètres Généraux</h2>
	<p class="text-sm text-muted-foreground md:text-base">
		Installation SSDv2.
	</p>

	<TestForm data={data.form} actionUrl="/settings/test" />
</div>
