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

    // Import du schéma des helpers pour la gestion des données
    export let data: SuperValidated<Infer<SeedboxSettingsSchema>>;
    export let actionUrl: string = '?/default';
    export let label = "";
    export let fieldDescription = ""; // Ajout de la description du champ
    export let name;
    export let scriptName: string = 'appli'; 

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
		console.log("Formulaire soumis avec succès :", $formData.traefik);

		if ($formData.traefik.authMethod === "oauth") {
			console.log("Oauth Client:", $formData.traefik.oauth_client);
			console.log("Oauth Secret:", $formData.traefik.oauth_secret);
			console.log("Oauth Mail:", $formData.traefik.oauth_mail);
			
			if (!$formData.traefik.oauth_client || !$formData.traefik.oauth_secret || !$formData.traefik.oauth_mail) {
				alert("Veuillez remplir tous les champs OAuth.");
				return;
			}
		}
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
            const currentPath = $page.url.pathname;  // Récupérer l'URL actuelle

            if (currentPath === '/onboarding/2') {
                // Redirection vers une nouvelle page uniquement si on est sur /onboarding/2
                goto('/onboarding/3');
        }
    }


</script>

<!-- Formulaire principal avec utilisation du schéma pour la validation -->
<form method="POST" action={actionUrl} use:enhance class="my-8 flex flex-col gap-2" on:submit={handleFormSuccess}>

<div class="flex flex-col items-start">
    <div class="flex items-center">
        <label style="font-size: 14px" for="showLogs" class="flex items-center">Activer les logs</label>
        <input type="checkbox" bind:checked={showLogs} class="ml-9" id="showLogs" />
    </div>
    <p style="font-size: 13px" class="text-gray-500 text-sm mt-1">Logs en temps réel.</p>
</div>

{#if !showLogs}
    <!-- Champs de texte gérés par le schéma dans helpers -->
    <TextField {form} name="username" label="Username" {formData} />
    <TextField {form} name="email" label="Email" {formData} />
    <TextField {form} name="domain" label="Domaine" {formData} />
    <TextField {form} name="password" label="Password" {formData} />
    <TextField {form} name="cloudflare_login" label="Cloudflare Mail" {formData} />
    <TextField {form} name="cloudflare_api_key" label="Cloudflare Api" {formData} />

<!-- Boutons radio pour choisir la méthode d'authentification -->
<div class="flex items-center gap-4">
    <label class="text-sm" for="auth-basique">Authentification Traefik</label>
    <div class="flex gap-10 ml-20">
        <label class="flex items-center gap-2 text-sm" for="auth-basique">
            <input 
                id="auth-basique"
                type="radio" 
                bind:group={$formData.traefik.authMethod} 
                value="basique" 
                class="appearance-none border-2 border-teal-400 rounded-full checked:bg-teal-400 checked:border-teal-400 w-4 h-4" 
            />
            <span>basique</span>
        </label>
        <label class="flex items-center gap-2 text-sm" for="auth-oauth">
            <input 
                id="auth-oauth"
                type="radio" 
                bind:group={$formData.traefik.authMethod} 
                value="oauth" 
                class="appearance-none border-2 border-teal-400 rounded-full checked:bg-teal-400 checked:border-teal-400 w-4 h-4" 
            />
            <span>Oauth</span>
        </label>
        <label class="flex items-center gap-2 text-sm" for="auth-authelia">
            <input 
                id="auth-authelia"
                type="radio" 
                bind:group={$formData.traefik.authMethod} 
                value="authelia" 
                class="appearance-none border-2 border-teal-400 rounded-full checked:bg-teal-400 checked:border-teal-400 w-4 h-4" 
            />
            <span>authelia</span>
        </label>
        <label class="flex items-center gap-2 text-sm" for="auth-aucune">
            <input 
                id="auth-aucune"
                type="radio" 
                bind:group={$formData.traefik.authMethod} 
                value="aucune" 
                class="appearance-none border-2 border-teal-400 rounded-full checked:bg-teal-400 checked:border-teal-400 w-4 h-4" 
            />
            <span>aucune</span>
        </label>
    </div>
</div>

<!-- Champs spécifiques pour OAuth -->
{#if $formData.traefik.authMethod === "oauth"}
    <div transition:slide style="margin-top: 20px;">
<div style="display: flex; align-items: center; margin-bottom: 8px;">
    <label for="oauth_client" style="font-size: 14px; margin-right: 110px; min-width: 100px;">oauth Client</label>
    <input
        id="oauth_client"
        type="text"
        name="traefik.oauth_client"
        bind:value={$formData.traefik.oauth_client}
        placeholder="Oauth Client"
        style="flex-basis: 400px; padding: 8px; font-size: 14px; border-radius: 8px; border: 1px solid #ccc; outline: none;"
    />
</div>

<div style="display: flex; align-items: center; margin-bottom: 8px;">
    <label for="oauth_secret" style="font-size: 14px; margin-right: 110px; min-width: 100px;">oauth Secret</label>
    <input
        id="oauth_secret"
        type="text"
        name="traefik.oauth_secret"
        bind:value={$formData.traefik.oauth_secret}
        placeholder="Oauth Secret"
        style="flex-basis: 400px; padding: 8px; font-size: 14px; border-radius: 8px; border: 1px solid #ccc; outline: none;"
    />
</div>

<div style="display: flex; align-items: center; margin-bottom: 8px;">
    <label for="oauth_mail" style="font-size: 14px; margin-right: 110px; min-width: 100px;">oauth Mail</label>
    <input
        id="oauth_mail"
        type="email"
        name="traefik.oauth_mail"
        bind:value={$formData.traefik.oauth_mail}
        placeholder="Oauth Mail"
        style="flex-basis: 400px; padding: 8px; font-size: 14px; border-radius: 8px; border: 0.75px solid #ccc; outline: none;"
    />
</div>
    </div>
{/if}

    <div class="form-group">
        <label for={name} class="text-sm">{label}</label>
        
        <!-- Description du champ -->
        {#if fieldDescription}
            <p class="text-gray-500 text-xs">{fieldDescription}</p>
        {/if}
    </div>

    <TextField 
        {form} 
        name="domainperso" 
        label="Sous domaine Personnalisé"
        value="traefik"
        {formData} 
        fieldDescription="Par default traefik" 
    />

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
                    Enregistrer les modifications
                    <span class="ml-1" class:hidden={$page.url.pathname === '/settings/seedbox'}>
                        et continuer
                    </span>
                {/if}
            </Form.Button>
        </div>
    </div>

</form>

<RunScript {scriptName} {showLogs} on:buttonStateChange={updateButtonState} on:statusMessageUpdate={updateStatusMessage} on:scriptCompleted={handleScriptCompleted} />

<Separator class="mt-4" />

{#if formDebug}
	<SuperDebug data={$formData} />
{/if}

