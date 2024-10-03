<script lang="ts">
	import { slide } from 'svelte/transition';
	import { page } from '$app/stores';
	import { getContext } from 'svelte';
	import SuperDebug from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { type SuperValidated, type Infer, superForm } from 'sveltekit-superforms';
	import * as Form from '$lib/components/ui/form';
	import { zurgSettingsSchema, type ZurgSettingsSchema } from '$lib/forms/helpers';
	import { toast } from 'svelte-sonner';
	import TextField from './components/text-field.svelte';
	import NumberField from './components/number-field.svelte';
	import CheckboxField from './components/checkbox-field.svelte';
	import GroupCheckboxField from './components/group-checkbox-field.svelte';
	import ArrayField from './components/array-field.svelte';
	import { Loader2, Trash2, Plus } from 'lucide-svelte';
	import { Separator } from '$lib/components/ui/separator';
	import { Input } from '$lib/components/ui/input';

	export let data: SuperValidated<Infer<ZurgSettingsSchema>>;
	export let actionUrl: string = '?/default';

	const formDebug: boolean = getContext('formDebug');

	const form = superForm(data, {
		validators: zodClient(zurgSettingsSchema)
	});

	const { form: formData, enhance, message, delayed } = form;

	$: if ($message && $page.status === 200) {
		toast.success($message);
	} else if ($message) {
		toast.error($message);
	}

	function addField(name: string) {
		// @ts-expect-error eslint-disable-next-line
		$formData[name] = [...$formData[name], ''];
	}

	function removeField(name: string, index: number) {
		// @ts-expect-error eslint-disable-next-line
		$formData[name] = $formData[name].filter((_, i) => i !== index);
	}
</script>

<form method="POST" action={actionUrl} use:enhance class="my-8 flex flex-col gap-2">
	<TextField {form} name="rclone_path" {formData} />
	<TextField {form} name="library_path" {formData} />
	<GroupCheckboxField
		fieldTitle="Downloaders"
		fieldDescription="Enable only one downloader at a time"
	>
		<CheckboxField
			{form}
			name="realdebrid_enabled"
			label="Real-Debrid"
			{formData}
			isForGroup={true}
		/>
		<CheckboxField
			{form}
			name="alldebrid_enabled"
			label="All-Debrid"
			{formData}
			isForGroup={true}
		/>
	</GroupCheckboxField>

	{#if $formData.realdebrid_enabled}
		<div transition:slide>
			<TextField {form} name="realdebrid_api_key" {formData} isProtected={true} />
		</div>
	{/if}

	{#if $formData.alldebrid_enabled}
		<div transition:slide>
			<TextField {form} name="alldebrid_api_key" {formData} isProtected={true} />
		</div>
	{/if}
	<CheckboxField {form} name="media_enabled" label="Création des dossiers Medias" {formData} />

	{#if $formData.media_enabled}
		<div transition:slide>
			<ArrayField {form} name="Dossiers à Créer" {formData}>
				{#each $formData.media_on_item_type as _, i}
					<Form.ElementField {form} name="media_on_item_type[{i}]">
						<Form.Control let:attrs>
							<div class="flex items-center gap-2">
								<Input
									type="text"
									spellcheck="false"
									autocomplete="false"
									{...attrs}
									bind:value={$formData.media_on_item_type[i]}
								/>

								<div class="flex items-center gap-2">
									<Form.Button
										type="button"
										size="sm"
										variant="destructive"
										on:click={() => {
											removeField('media_on_item_type', i);
										}}
									>
										<Trash2 class="h-4 w-4" />
									</Form.Button>
								</div>
							</div>
						</Form.Control>
					</Form.ElementField>
				{/each}
				<div class="flex w-full items-center justify-between gap-2">
					<p class="text-sm text-muted-foreground">Ajouter des dossiers</p>
					<Form.Button
						type="button"
						size="sm"
						variant="outline"
						on:click={() => {
							addField('media_on_item_type');
						}}
					>
						<Plus class="h-4 w-4" />
					</Form.Button>
				</div>
			</ArrayField>

		</div>
	{/if}


	<Separator class="mt-4" />
	<div class="flex w-full justify-end">
		<Form.Button disabled={$delayed} type="submit" size="sm" class="w-full lg:max-w-max">
			{#if $delayed}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" />
			{/if}
			Save changes
			<span class="ml-1" class:hidden={$page.url.pathname === '/settings/zurg'}
				>and continue</span
			>
		</Form.Button>
	</div>
</form>

{#if formDebug}
	<SuperDebug data={$formData} />
{/if}
