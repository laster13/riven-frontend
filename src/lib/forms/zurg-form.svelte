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
	import RunScript from '../../routes/run-script.svelte';
        import { goto } from '$app/navigation';
 
	export let data: SuperValidated<Infer<ZurgSettingsSchema>>;
	export let actionUrl: string = '?/default';
	export let scriptName: string = 'zurg';

	const formDebug: boolean = getContext('formDebug');

	const form = superForm(data, {
		validators: zodClient(zurgSettingsSchema)
	});

	const { form: formData, enhance, message, delayed } = form;

	let isSubmitting = false;
	let showSpinner = false;
	let statusMessage = '';
        let showLogs = false;

	function handleFormSuccess() {
		console.log("Formulaire soumis avec succès.");
		toast.success('Script déclenché: ' + scriptName);

		// Vérification du dispatch de l'événement
		console.log('Dispatching startScript event for:', scriptName);

		// Envoyer un événement personnalisé à RunScript pour démarrer le script
		const scriptEvent = new CustomEvent('startScript', { detail: { scriptName } });
		window.dispatchEvent(scriptEvent); // Envoie l'événement globalement
	}

	// Fonction pour gérer l'état du bouton via les événements du composant RunScript
	function updateButtonState(event) {
		const { isSubmitting: submitting, showSpinner: spinner } = event.detail;
		isSubmitting = submitting;
		showSpinner = spinner;
	}

	// Fonction pour mettre à jour le message d'état du script
	function updateStatusMessage(event) {
		statusMessage = event.detail.statusMessage;
	}

	function addField(name: string) {
		// @ts-expect-error eslint-disable-next-line
		$formData[name] = [...$formData[name], ''];
	}

	function removeField(name: string, index: number) {
		// @ts-expect-error eslint-disable-next-line
		$formData[name] = $formData[name].filter((_, i) => i !== index);
	}

        function handleScriptCompleted() {
            const currentPath = $page.url.pathname;

            if (currentPath === '/onboarding/3') {
                goto('/onboarding/ssd');
        }
    }

</script>

<form method="POST" action={actionUrl} use:enhance class="my-8 flex flex-col gap-2" on:submit={handleFormSuccess}>

<div class="flex flex-col items-start">
    <div class="flex items-center">
        <label style="font-size: 14px" for="showLogs" class="flex items-center">Afficher les logs</label>
        <input type="checkbox" bind:checked={showLogs} class="ml-9" id="showLogs" />
    </div>
    <p style="font-size: 13px" class="text-gray-500 text-sm mt-1">Logs en temps réel.</p>
</div>

{#if !showLogs}
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
{/if}

	<Separator class="mt-4" />
    <div class="flex w-full justify-between items-center">
        {#if statusMessage}
            <p class="text-orange-500 text-sm blinking-message">{statusMessage}</p>
        {/if}

        <div class="ml-auto">
            <Form.Button disabled={isSubmitting} type="submit" size="sm" class="w-full lg:max-w-max">
                {#if showSpinner}
                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                    <p class="text-sm text-gray-500">Soumission en cours...</p>
                {:else}
                    Sauvegarder
                    <span class="ml-1" class:hidden={$page.url.pathname === '/settings/zurg'}>
                        et continuer
                    </span>
                {/if}
            </Form.Button>
        </div>
    </div>
</form>

<RunScript {scriptName} {showLogs} on:buttonStateChange={updateButtonState} on:statusMessageUpdate={updateStatusMessage} on:scriptCompleted={handleScriptCompleted} />


{#if formDebug}
	<SuperDebug data={$formData} />
{/if}
