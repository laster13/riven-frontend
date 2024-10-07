<script lang="ts">
	import { page } from '$app/stores';
	import { getContext } from 'svelte';
	import SuperDebug from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { type SuperValidated, type Infer, superForm } from 'sveltekit-superforms';
	import * as Form from '$lib/components/ui/form';
	import { mediaServerSettingsSchema, type MediaServerSettingsSchema } from '$lib/forms/helpers';
	import { toast } from 'svelte-sonner';
	import { Separator } from '$lib/components/ui/separator';
	import CheckboxField from './components/checkbox-field.svelte';
	import { Loader2 } from 'lucide-svelte';
	import RunScript from '../../routes/run-script.svelte'; 
        import { onMount } from 'svelte';
        import { goto } from '$app/navigation';

	// Initialisation du formulaire et du scriptName
	export let data: SuperValidated<Infer<MediaServerSettingsSchema>>;
	export let actionUrl: string = '?/default';
	export let scriptName: string = 'webui'; // Exemple de valeur statique, peut être modifié dynamiquement.

	// Débogage initial
	console.log("Nom du script fourni :", scriptName);

	// Configuration du formulaire avec validation
	const form = superForm(data, { validators: zodClient(mediaServerSettingsSchema) });
	const { form: formData, enhance, message, delayed } = form;

	// Variables pour gérer l'état du bouton
	let isSubmitting = false;
	let showSpinner = false;
	let statusMessage = '';
        let showLogs = false;

    onMount(() => {
        const uniqueParam = new Date().getTime();  // Crée un paramètre unique basé sur l'heure
        const currentUrl = window.location.href;
        
        if (!currentUrl.includes('nocache')) {
            window.location.href = `${currentUrl}?nocache=${uniqueParam}`;
        }
    });
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

	// Fonction pour basculer l'état de la case à cocher
	function handleCheckboxChange(event) {
		showLogs = event.target.checked;
	}

        function handleScriptCompleted() {
            const currentPath = $page.url.pathname;  // Récupérer l'URL actuelle

            if (currentPath === '/onboarding/1') {
                // Redirection vers une nouvelle page uniquement si on est sur /onboarding/1
                goto('/onboarding/2');
        }
    }

</script>

<!-- Formulaire pour soumettre les données -->
<form method="POST" action={actionUrl} use:enhance class="my-8 flex flex-col gap-2" on:submit={handleFormSuccess}>

<div class="flex flex-col items-start">
    <div class="flex items-center">
        <label for="showLogs" class="flex items-center">Activer les logs</label>
        <input type="checkbox" bind:checked={showLogs} class="ml-9" id="showLogs" />
    </div>
    <p class="text-gray-500 text-sm mt-1">Logs en temps réel.</p>
</div>


    <Separator class="mt-4" />
    <div class="flex w-full justify-between items-center">
        <!-- Affichage du message d'état clignotant à gauche du bouton -->
        {#if statusMessage}
            <p class="text-gray-500 text-sm blinking-message">{statusMessage}</p>
        {/if}

        <!-- Gestion de l'affichage et de l'état du bouton à droite -->
        <div class="ml-auto">
            <Form.Button disabled={isSubmitting} type="submit" size="sm" class="w-full lg:max-w-max">
                {#if showSpinner}
                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                    <p class="text-sm text-gray-500">Soumission en cours...</p>
                {:else}
                    Enregistrer les modifications
                    <span class="ml-1" class:hidden={$page.url.pathname === '/settings/mediaserver'}>
                        et continuer
                    </span>
                {/if}
            </Form.Button>
        </div>
    </div>

</form>

<!-- Composant RunScript pour exécuter le script et gérer son état -->
<RunScript {scriptName} {showLogs} on:buttonStateChange={updateButtonState} on:statusMessageUpdate={updateStatusMessage} on:scriptCompleted={handleScriptCompleted} />
