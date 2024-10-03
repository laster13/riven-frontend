<script lang="ts">
    import type { PageData } from './$types';
    import ApplicationsForm from '$lib/forms/applications-form.svelte';

    export let data: PageData;
</script>

<div class="flex flex-col">
    <h2 class="text-xl font-medium md:text-2xl">Applications</h2>
    <p class="text-sm text-muted-foreground md:text-base">Configuration des Applications</p>

    <ApplicationsForm data={data.form} actionUrl="/settings/applications" />
</div>
