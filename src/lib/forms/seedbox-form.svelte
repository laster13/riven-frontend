<script lang="ts">
    import { slide } from 'svelte/transition';
    import { page } from '$app/stores';
    import { getContext } from 'svelte';
    import SuperDebug from 'sveltekit-superforms';
    import { zodClient } from 'sveltekit-superforms/adapters';
    import { type SuperValidated, type Infer, superForm } from 'sveltekit-superforms';
    import * as Form from '$lib/components/ui/form';
    import { seedboxSettingsSchema, type SeedboxSettingsSchema } from '$lib/forms/helpers';
    import { toast } from 'svelte-sonner';
    import TextField from './components/text-field.svelte';
    import { Loader2 } from 'lucide-svelte';
    import { Separator } from '$lib/components/ui/separator';
    import RunScript from '../../routes/run-script.svelte';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import CheckboxField from './components/checkbox-field.svelte';

    export let data: SuperValidated<Infer<SeedboxSettingsSchema>>;
    export let actionUrl: string = '?/default';
    export let label = "";
    export let fieldDescription = ""; // Ajout de la description du champ
    export let name;
    export let scriptName: string = 'infos';
    let isScriptCompleted = false;

    const formDebug: boolean = getContext('formDebug');

    // Utilisation de superForm avec les validators et le schéma venant des helpers
    const form = superForm(data, {
        validators: zodClient(seedboxSettingsSchema),
        dataType: "json",  // Permet de traiter correctement les données complexes
    });

    const { form: formData, enhance, message, delayed } = form;

	let isSubmitting = false;
	let showSpinner = false;
	let statusMessage = '';
        let showLogs = false;

	// Gérer la soumission du formulaire
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

    onMount(() => {
        const uniqueParam = new Date().getTime();  // Crée un paramètre unique basé sur l'heure
        const currentUrl = window.location.href;
        
        if (!currentUrl.includes('nocache')) {
            window.location.href = `${currentUrl}?nocache=${uniqueParam}`;
        }
    });

    function handleScriptCompleted() {
        isScriptCompleted = true; // Marquer le script comme terminé
        redirectToNextPage(); // Appeler la redirection une fois le script terminé
    }

    // Fonction de redirection conditionnelle
    function redirectToNextPage() {
        const currentPath = $page.url.pathname;

        if (isScriptCompleted && currentPath === '/onboarding/3') {
            goto('/onboarding/4'); // Redirige uniquement après la fin du script
        }
    }

</script>

<!-- Formulaire principal avec utilisation du schéma pour la validation -->
<form method="POST" action={actionUrl} use:enhance class="my-8 flex flex-col gap-2" on:submit={handleFormSuccess}>

<div class="flex flex-col items-start">
    <div class="flex items-center">
        <label style="font-size: 14px" for="showLogs" class="flex items-center">Afficher les logs</label>
        <input type="checkbox" bind:checked={showLogs} class="ml-9" id="showLogs" />
    </div>
    <p style="font-size: 13px" class="text-gray-500 text-sm mt-1">Logs en temps réel.</p>
</div>

{#if !showLogs}
    <div transition:slide>
        <TextField {form} name="username" label="Username" {formData} />
    </div>

    <div transition:slide>
        <TextField {form} name="email" label="Email" {formData} />
    </div>

    <div transition:slide>
        <TextField {form} name="domain" label="Domaine" {formData} />
    </div>

    <div transition:slide>
        <TextField {form} name="password" label="Password" {formData} />
    </div>

    <div transition:slide>
        <TextField {form} name="cloudflare_login" label="Cloudflare Mail" {formData} />
    </div>

    <div transition:slide>
        <TextField {form} name="cloudflare_api_key" label="Cloudflare API" {formData} />
    </div>

    <div transition:slide>
        <CheckboxField {form} name="oauth_enabled" label="Oauth" {formData} />
    </div>

        {#if $formData.oauth_enabled}
            <div transition:slide>
                <TextField {form} name="oauth_client" label="Oauth Client" {formData} />
            </div>

            <div transition:slide>
                <TextField {form} name="oauth_secret" label="Oauth Secret" {formData} />
            </div>

            <div transition:slide>
                <TextField {form} name="oauth_mail" label="Oauth Mail" {formData} />
            </div>
        {/if}

    <div transition:slide>
        <CheckboxField {form} name="zurg_enabled" label="Zurg" fieldDescription="Version Public" {formData} />
    </div>

        {#if $formData.zurg_enabled}
            <div transition:slide>
                <TextField {form} name="zurg_token" label="Zurg Token" fieldDescription="Version Sponsor" {formData} />
            </div>
        {/if}

        <Separator class="mt-4" />

        <!-- Exemple de groupe de champs avec description -->
        <div class="form-group">
            <label for={name} class="text-sm">{label}</label>

            <!-- Description du champ, affichée si présente -->
            {#if fieldDescription}
                <p class="text-gray-500 text-xs">{fieldDescription}</p>
            {/if}
        </div>
{/if}

    <!-- Bouton de soumission -->
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
                    <span class="ml-1" class:hidden={$page.url.pathname === '/settings/seedbox'}>
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

