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
	export let scriptName: string = 'requis';
        let fileExists: boolean | null = null; // Statut de la seedbox (fichier)

	// Débogage initial
	console.log("Nom du script fourni :", scriptName);

	// Configuration du formulaire avec validation
	const { form: formData, enhance, message, delayed } = form;
        const backendUrl = window.location.protocol === 'https:' 
        ? import.meta.env.VITE_BACKEND_URL_HTTPS 
        : import.meta.env.VITE_BACKEND_URL_HTTP;

	// Variables pour gérer l'état du bouton
	let isSubmitting = false;
	let showSpinner = false;
	let statusMessage = '';
        let showLogs = false;

    onMount(() => {
        const uniqueParam = new Date().getTime();  // Crée un paramètre unique pour éviter le cache
        const currentUrl = window.location.href;
        
        if (!currentUrl.includes('nocache')) {
            // Redirige l'URL avec un paramètre de cache unique si 'nocache' n'est pas déjà présent
            window.location.href = `${currentUrl}?nocache=${uniqueParam}`;
        } else {
            // Vérifie l'état du fichier ssdb si l'URL contient 'nocache'
            checkFileStatus();
        }
    });

// Gérer la soumission du formulaire
async function handleFormSuccess(event) {
    event.preventDefault();
    console.log("Formulaire soumis avec succès.");

    // Activer l'état de soumission et afficher le spinner
    isSubmitting = true;
    showSpinner = true;
    statusMessage = "Récupération de la configuration SSDv2...";

    try {
        // Si le SSD est installé, appeler l'API
        if (fileExists) {
            console.log("SSD installé, appel de l'API.");
            const response = await fetch(`${backendUrl}/scripts/update-config`);
            if (response.ok) {
                const result = await response.json();
                console.log("Réponse de l'API:", result);
                toast.success('Configuration mise à jour avec succès');
                statusMessage = "Mise à jour avec succès.";

                statusMessage = "";
            } else {
                throw new Error('Erreur lors de la mise à jour');
            }
        } else {
            // Cas où le SSD n'est pas installé
            toast.success('Script déclenché: ' + scriptName);
            console.log('scriptName:', scriptName);

            // Dispatch d'un événement pour démarrer le script
            console.log('Dispatching startScript event for:', scriptName);
            const scriptEvent = new CustomEvent('startScript', { detail: { scriptName } });
            window.dispatchEvent(scriptEvent);

            statusMessage = "Script déclenché sans SSD.";
        }
    } catch (error) {
        console.error('Erreur lors de la soumission:', error);
        toast.error('Échec de la mise à jour de la configuration');
        statusMessage = "Échec de la mise à jour.";
    } finally {
        // Désactiver le spinner et l'état de soumission
        isSubmitting = false;
        showSpinner = false;
    }
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

    // Fonction pour vérifier l'existence du fichier ssdb
    async function checkFileStatus() {
        try {
            const response = await fetch(`${backendUrl}/scripts/check-file`);
            const result = await response.json();
            fileExists = result.exists;
        } catch (error) {
            console.error('Erreur lors de la vérification du fichier:', error);
            fileExists = false;
        }
    }

	// Fonction pour basculer l'état de la case à cocher
	function handleCheckboxChange(event) {
		showLogs = event.target.checked;
	}

    // Fonction exécutée lorsque le script est terminé
function handleScriptCompleted() {
    const currentPath = $page.url.pathname;  // Récupérer l'URL actuelle

    if (currentPath === '/onboarding/1') {
        // Attendre 2 secondes avant la redirection
        setTimeout(() => {
            goto('/onboarding/2');
        }, 1000);  // 2000 millisecondes = 2 secondes
    }
}

</script>

<!-- Formulaire pour soumettre les données -->
<form method="POST" action={actionUrl} use:enhance class="my-8 flex flex-col gap-2" on:submit={handleFormSuccess}>

    <!-- Logs en temps réel avec case à cocher -->
    <div class="flex flex-col items-start">
        <div class="flex items-center">
            <span for="showLogs" class="flex items-center font-medium text-sm">Afficher les logs</span>
            <input type="checkbox" bind:checked={showLogs} class="ml-9" id="showLogs" />
        </div>
        <p class="text-gray-500 text-sm mt-1">Logs en temps réel</p>
    </div>

    <!-- Affichage en fonction de l'existence du fichier avec un label -->
    <div class="flex items-center space-x-4">
        <span class="font-medium text-sm">État de la seedbox :</span>
        {#if fileExists === null}
            <p style="font-size: 14px; color: orange;">Vérification de l'état de la seedbox en cours...</p>
        {:else if fileExists}
            <div class="py-1 px-2 bg-green-500 text-black rounded">
                <p class="text-sm">SSD installé</p>
            </div>
        {:else}
            <div class="py-1 px-2 bg-red-500 text-black rounded">
                <p class="text-sm">SSD non installé</p>
            </div>
        {/if}
    </div>

    <!-- Séparateur -->
    <Separator class="mt-4" />

    <!-- Bouton d'enregistrement des modifications -->
    <div class="flex w-full justify-between items-center">
        <!-- Affichage du message d'état si présent -->
        {#if statusMessage}
            <p class="text-orange-500 text-sm blinking-message">{statusMessage}</p>
        {/if}

        <!-- Bouton de soumission avec gestion du spinner -->
        <div class="ml-auto">
            <Form.Button disabled={isSubmitting} type="submit" size="sm" class="w-full lg:max-w-max">
                {#if showSpinner}
                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                    <p class="text-sm text-gray-500">Soumission en cours...</p>
                {:else}
                    Sauvegarder
                    <span class="ml-1" class:hidden={$page.url.pathname === '/settings/test'}>
                        et continuer
                    </span>
                {/if}
            </Form.Button>
        </div>
    </div>

</form>

<!-- Composant RunScript pour exécuter le script et gérer son état -->
<RunScript {scriptName} {showLogs} 
    on:buttonStateChange={updateButtonState} 
    on:statusMessageUpdate={updateStatusMessage} 
    on:scriptCompleted={handleScriptCompleted} 
/>
