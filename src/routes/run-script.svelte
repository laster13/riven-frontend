<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { toast } from 'svelte-sonner';

    export let scriptName: string; // Le scriptName est passé via un événement
    export let label: string | null = null;  // Label peut être null si non nécessaire
    export let showLogs: boolean;

    let statusMessage = '';  // Message d'état
    let logs: string[] = [];
    let backendUrl;

    // Détermination du backend URL selon le protocole
    if (typeof window !== 'undefined') {
        // Si nous sommes côté client, déterminer le protocole (http ou https)
        backendUrl = window.location.protocol === 'https:'
            ? import.meta.env.VITE_BACKEND_URL_HTTPS
            : import.meta.env.VITE_BACKEND_URL_HTTP;
    } else {
        // Si nous sommes côté serveur (SSR), utiliser une valeur par défaut (ou autre logique)
        backendUrl = import.meta.env.VITE_BACKEND_URL; // Valeur par défaut pour SSR
    }

    const dispatch = createEventDispatcher(); // Dispatcher pour envoyer l'état du bouton

    // Fonction pour exécuter le script et écouter les logs en temps réel
    function runScript() {
        console.log('Lancement du script:', scriptName, label ? `avec label: ${label}` : "sans label");  // Débogage
        logs = [];
        statusMessage = "Lancement du script...";

        // Mettre à jour l'état du bouton via l'événement
        dispatch('buttonStateChange', { isSubmitting: true, showSpinner: true });

        // Construire l'URL en fonction de la présence ou non du label
        const url = label
            ? `${backendUrl}/api/v1/scripts/run/${scriptName}?label=${encodeURIComponent(label)}`
            : `${backendUrl}/api/v1/scripts/run/${scriptName}`;
        console.log('URL générée :', url);  // Ajouter ce log ici pour vérifier l'URL

        const eventSource = new EventSource(url);

        eventSource.onmessage = (event) => {
            console.log("Log reçu : ", event.data); // Vérifiez ici
            logs = [event.data, ...logs].slice(0, 20); // Limiter à 15 logs visibles
            statusMessage = "Script en cours d'exécution...";
            dispatch('statusMessageUpdate', { statusMessage });
        };

        eventSource.onerror = (error) => {
            console.error("Erreur de connexion à EventSource :", error);
            toast.error("Erreur lors de l'exécution du script.");
            statusMessage = "Erreur lors de l'exécution du script.";
            dispatch('statusMessageUpdate', { statusMessage });
            eventSource.close();
            dispatch('buttonStateChange', { isSubmitting: false, showSpinner: false });
        };

        eventSource.addEventListener("end", () => {
            toast.success("Installation du script terminée");
            statusMessage = '';

            // Mise à jour de l'état du bouton (fin d'exécution)
            dispatch('buttonStateChange', { isSubmitting: false, showSpinner: false });
            dispatch('statusMessageUpdate', { statusMessage });
            dispatch('scriptCompleted');
            eventSource.close();
        });
    }

    // Écoute de l'événement 'startScript' pour déclencher l'exécution du script
    onMount(() => {
        window.addEventListener('startScript', (event: CustomEvent) => {
            console.log('Événement startScript capté avec:', event.detail.scriptName);
            scriptName = event.detail.scriptName;
            label = event.detail.label || null;  // Capturer le label s'il est présent
            console.log('Valeur de selectedItem.label captée dans RunScript:', label);  // Ajoutez ce log
            if (scriptName) {
                runScript();
            }
        });
    });
</script>

<!-- Affichage des logs -->
{#if showLogs}
<pre class="text-xs">{logs.join("\n")}</pre>
{/if}
