<script lang="ts">
    import { slide } from 'svelte/transition';
    import { page } from '$app/stores';
    import { getContext, onMount } from 'svelte';
    import SuperDebug from 'sveltekit-superforms';
    import { zodClient } from 'sveltekit-superforms/adapters';
    import { type SuperValidated, type Infer, superForm } from 'sveltekit-superforms';
    import * as Form from '$lib/components/ui/form';
    import { applicationsSettingsSchema, type ApplicationsSettingsSchema } from '$lib/forms/helpers';
    import { toast } from 'svelte-sonner';
    import TextField from '$lib/forms/components/text-field.svelte';
    import CheckboxField from './components/checkbox-field.svelte';
    import GroupCheckboxField from './components/group-checkbox-field.svelte';
    import ArrayField from '$lib/forms/components/array-field.svelte';
    import { Loader2, Trash2, Plus, RefreshCw } from 'lucide-svelte';
    import { Separator } from '$lib/components/ui/separator';
    import * as Combobox from "/src/plugins";
    import { Input } from '$lib/components/ui/input';
    import { goto } from '$app/navigation';
    import { writable } from 'svelte/store';
    import { Radio } from 'flowbite-svelte';
    import { Button } from '$lib/components/ui/button';
    import { v4 as uuidv4 } from 'uuid';
    import RunScript from '../../routes/run-script.svelte'; 

    export let data: SuperValidated<Infer<ApplicationsSettingsSchema>>;
    export let actionUrl: string = '?/default';
    export let scriptName: string = 'appli';

    let applications = [];
    let domaine = {};
    let selectedItem: Item | null = null;
    let selectedApplication = '';

    // Variables pour gérer l'état du bouton
    let isSubmitting = false;
    let showSpinner = false;
    let statusMessage = '';
    let showLogs = false;

    const formDebug: boolean = getContext('formDebug');

    console.log('Initialisation du formulaire avec les données:', JSON.stringify(data, null, 2));
    const form = superForm(data, {
        validators: zodClient(applicationsSettingsSchema),
        dataType: "json",
    });

    const { form: formData, enhance, message, delayed } = form;
    formData.domaine = typeof formData.domaine === 'object' && !Array.isArray(formData.domaine) ? formData.domaine : {};


    function resetForm() {
        formData.update(() => ({
            dossiers_on_item_type: [],
            authentification: { authappli: "basique" },
            domaine: {},
            plex_token: "",
            plex_login: "",
            plex_password: ""
        }));

        resetCombobox();
    }

    function resetCombobox() {
        selectedItem = null;
        selectedApplication = '';
        model = Combobox.init(config, {
            allItems: fruits,
            inputMode: { type: "search-mode", inputValue: "" },  // Réinitialiser l'input
            selectMode: { type: "single-select" },
        });
    }

    const handleSubmit = (event) => {
        event.preventDefault();

        console.log("===== Début de la fonction handleSubmit =====");
        formData.domaine = typeof formData.domaine === 'string' ? JSON.parse(formData.domaine) : formData.domaine || {};
        console.log("FormData complet prêt pour soumission :", formData);

        const isSuccess = true; // Supposons que la soumission réussit
        if (isSuccess) {
            handleFormSuccess();
            resetForm(); // Réinitialiser complètement le formulaire
            event.target.reset(); // Réinitialiser le visuel du formulaire HTML
            console.log('Formulaire réinitialisé');
        }
    };

    const handleApplicationSelection = () => {
        selectedItem = model.selectedItems[0] || null;
        if (selectedItem) {
            domaine[selectedItem.label] = domaine[selectedItem.label] || '';
            console.log('Application sélectionnée:', selectedItem);
        }
    };

    const handleDomaineInput = (event) => {
        const inputValue = event.target.value;
        if (selectedItem?.label) {
            formData.domaine[selectedItem.label] = inputValue;
            console.log(`Domaine mis à jour pour ${selectedItem.label}:`, inputValue);
        }
    };

    type Item = { id: number; label: string };
    let fruits: Item[] = [];

    function initializeCombobox() {
        console.log('Initialisation de la combobox avec les fruits:', fruits);
        model = Combobox.init(config, {
            allItems: fruits,
            inputMode: {
                type: "search-mode",
                inputValue: "",
            },
            selectMode: {
                type: "single-select",
            },
        });
    }

    $: state = Combobox.toState(config, model);
    console.log('État de la combobox mis à jour:', state);

    onMount(async () => {
        try {
            console.log('Tentative de chargement des données depuis /services.json...');
            const response = await fetch('/services.json');
            if (!response.ok) throw new Error('Failed to load');
            const jsonData = await response.json();
            fruits = jsonData.items || [{ id: 0, label: 'No items available' }];
            console.log('Fruits chargés:', fruits);
            initializeCombobox();
        } catch (error) {
            console.error('Erreur lors du chargement des items:', error);
            fruits = [{ id: 0, label: 'No items available' }];
            initializeCombobox();
        }
    });

    let items: { [itemId: string]: HTMLElement } = {};
    let input: HTMLInputElement | null = null;

    const config = Combobox.initConfig<Item>({
        toItemId: (item) => item.id,
        toItemInputValue: (item) => item.label,
    });

    let model = Combobox.init(config, {
        allItems: fruits,
        inputMode: {
            type: "search-mode",
            inputValue: "",
        },
        selectMode: {
            type: "single-select",
        },
    });

    $: state = Combobox.toState(config, model);

    const dispatch = (msg: Combobox.Msg<Item> | null) => {
        if (!msg) return;

        const output = Combobox.update(config, { msg, model }, []);
        model = output.model;

        Combobox.handleEffects(output, {
            focusInput: () => input?.focus(),
            scrollItemIntoView: (item) => items[item.id]?.scrollIntoView({ block: "nearest" }),
        });

        Combobox.handleEvents(output, {
            onInputValueChanged() {
                console.log("Valeur de l'entrée modifiée:", state?.inputValue);
            },
            onSelectedItemsChanged() {
                selectedItem = model.selectedItems[0] || null;
                console.log("Élément sélectionné:", selectedItem);
            },
        });
    };

    const onKeydown = (event: KeyboardEvent) => {
        const msg = Combobox.keyToMsg<Item>(event.key);
        if (msg.shouldPreventDefault) event.preventDefault();
        dispatch(msg);
    };

    onMount(async () => {

        if (!$formData.authentification.authappli) {
            $formData.authentification.authappli = 'basique';
        }
        try {
            console.log('Tentative de chargement des applications depuis /settings.json...');
            const response = await fetch('/settings.json');
            if (!response.ok) throw new Error('Failed to load');
            const jsonData = await response.json();
            applications = jsonData.applications || [];
            console.log('Applications chargées:', applications);
            if (applications.length > 0) {
                selectedApplication = applications[0].id;
                console.log('Application sélectionnée par défaut:', selectedApplication);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des applications:', error);
        }
    });

    function addField(name: string) {
        console.log('Ajout d\'un champ:', name);
        $formData[name] = [...$formData[name], { label: '' }];
        console.log('Formulaire après ajout de champ:', $formData);
    }

    function removeField(name: string, index: number) {
        console.log('Suppression du champ', index, 'dans:', name);
        formData.update(currentData => {
            currentData[name] = currentData[name].filter((_, i) => i !== index);
            console.log('Formulaire après suppression de champ:', currentData);
            return currentData;
        });
    }

    function handleFormSuccess() {
        console.log("Formulaire soumis avec succès.");
        toast.success('Script déclenché: ' + scriptName);

        // Vérifier que selectedItem existe et a un label
        const label = selectedItem?.label;

        if (!label) {
            // Si selectedItem ou le label n'est pas défini, afficher une erreur
            toast.error("Aucune application sélectionnée. Veuillez sélectionner une application.");
            return;
        }

        // Vérification du dispatch de l'événement avec le label
        console.log('Dispatching startScript event for:', scriptName, 'with label:', label);

        // Envoyer un événement personnalisé à RunScript pour démarrer le script avec le label
        const scriptEvent = new CustomEvent('startScript', {
            detail: { scriptName, label }  // Passer le label ici
        });
        window.dispatchEvent(scriptEvent);  // Envoie l'événement globalement
    }

    function updateButtonState(event) {
        const { isSubmitting: submitting, showSpinner: spinner } = event.detail;
        isSubmitting = submitting;
        showSpinner = spinner;
    }

    function updateStatusMessage(event) {
        statusMessage = event.detail.statusMessage;
    }

    function handleCheckboxChange(event) {
        showLogs = event.target.checked;
    }

</script>

<style>
/* Conteneur principal pour le label et la combobox */
.combobox-container {
    display: flex;
    align-items: center;
}

/* Conteneur du label "Applications" */
.label-container {
    margin-right: 120px;
}

/* Ajustement de la largeur de la combobox */
.combobox-wrapper {
    flex-grow: 0;
}

.label-text {
    margin: 0;
    font-size: 1rem;
}

/* Styles existants pour la combobox */
.container {
    width: 100%;
    max-width: 200px;
}

@keyframes blink {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
}

.blinking-message {
    animation: blink 1.5s linear infinite;
}

.input-container {
    position: relative;
}

.label {
    display: block;
    margin-bottom: 0.5rem;
}

.input {
    padding: 0.25rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 0.875rem;
    box-sizing: border-box;
    background-color: #ffffff;
    outline: none;
}

.input:focus {
    border-color: #bbb;
}

.suggestions {
    color: #333;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 1;
    max-height: 150px;
    overflow-y: auto;
    border: 1px solid #ddd;
    background-color: #ffffff;
    margin: 0;
    padding: 0;
    list-style: none;
}

.option {
    padding: 0.25rem;
    cursor: pointer;
}

.highlighted {
    background-color: #f0f0f0;
}

.selected {
    background-color: #e0e0e0;
    color: #333;
}

.selected-and-highlighted {
    background-color: #d0d0d0;
}

.hide {
    display: none;
}

.selected-result {
    margin-top: 0.5rem;
    font-size: 0.875rem;
}
</style>

<!-- Formulaire pour la combobox -->
<form method="POST" action={actionUrl} use:enhance class="my-8 flex flex-col gap-2" on:submit={handleSubmit}>

<div class="flex flex-col items-start">
    <div class="flex items-center">
        <label style="font-size: 14px" for="showLogs" class="flex items-center">Afficher les logs</label>
        <input type="checkbox" bind:checked={showLogs} class="ml-9" id="showLogs" />
    </div>
    <p class="text-gray-500 text-sm mt-1">Logs en temps réel</p>
</div>

{#if !showLogs}
    <!-- Boutons radio pour choisir la méthode d'authentification -->
<div class="flex items-center gap-4">
    <label class="text-sm" for="authappli-basique">Authentification</label>
    <div class="flex gap-10 ml-20">
        <label class="flex items-center gap-2 text-sm" for="authappli-basique">
            <input 
                id="authappli-basique"
                name="authappli" 
                type="radio" 
                bind:group={$formData.authentification.authappli} 
                value="basique" 
                class="appearance-none border-2 border-teal-400 rounded-full checked:bg-teal-400 checked:border-teal-400 w-4 h-4" 
            />
            <span>basique</span>
        </label>
        <label class="flex items-center gap-2 text-sm" for="authappli-oauth">
            <input 
                id="authappli-oauth"
                name="authappli" 
                type="radio" 
                bind:group={$formData.authentification.authappli} 
                value="oauth" 
                class="appearance-none border-2 border-teal-400 rounded-full checked:bg-teal-400 checked:border-teal-400 w-4 h-4" 
            />
            <span>oauth</span>
        </label>
        <label class="flex items-center gap-2 text-sm" for="authappli-authelia">
            <input 
                id="authappli-authelia"
                name="authappli" 
                type="radio" 
                bind:group={$formData.authentification.authappli} 
                value="authelia" 
                class="appearance-none border-2 border-teal-400 rounded-full checked:bg-teal-400 checked:border-teal-400 w-4 h-4" 
            />
            <span>authelia</span>
        </label>
        <label class="flex items-center gap-2 text-sm" for="authappli-aucune">
            <input 
                id="authappli-aucune"
                name="authappli" 
                type="radio" 
                bind:group={$formData.authentification.authappli} 
                value="aucune" 
                class="appearance-none border-2 border-teal-400 rounded-full checked:bg-teal-400 checked:border-teal-400 w-4 h-4" 
            />
            <span>aucune</span>
        </label>
    </div>
</div>

<Separator class="mt-4" />

<div class="combobox-container">
    <div class="label-container">
        <p class="text-sm">Applications</p>
    </div>
    <div class="combobox-wrapper">
        <div class="input-container">
            <input 
                {...state?.aria.input}
                class="input"
                value={state?.inputValue || ""}
                bind:this={input}
                on:input={(event) => dispatch({ type: "inputted-value", inputValue: event.currentTarget.value })}
                on:focus={() => dispatch({ type: "focused-input" })}
                on:blur={() => dispatch({ type: "blurred-input" })}
                on:mousedown={() => dispatch({ type: "pressed-input" })}
                on:keydown={onKeydown}
                style="height: 37px; margin-left: -2px; width: 223px; padding: 6px; background-color: transparent;"
            />
            <ul {...state?.aria.itemList} class="suggestions" class:hide={!state?.isOpened}>
                {#if state?.renderItems.length === 0}
                    <li>No results</li>
                {/if}
                {#each state?.renderItems as item, index}
                    <div
                        {...item.aria}
                        role="option"
                        tabindex="0"
                        aria-selected={item.status === "selected"}
                        on:mousemove={() => dispatch({ type: "hovered-over-item", index })}
                        on:mousedown|preventDefault={() => dispatch({ type: "pressed-item", item: item.item })}
                        class="option"
                        class:highlighted={item.status === "highlighted"}
                        class:selected={item.status === "selected"}
                        class:selected-and-highlighted={item.status === "selected-and-highlighted"}
                    >
                        {item.inputValue}
                    </div>
                {/each}
            </ul>
        </div>
    </div>
</div>

<Separator class="mt-4" />

<CheckboxField {form} name="dossiers_enabled" label="Applications Installées" {formData} />
{#if $formData.dossiers_enabled}
    <div transition:slide>
        <ArrayField {form} name="" {formData}>
            {#each $formData.dossiers_on_item_type as _, i}
                <Form.ElementField {form} name="dossiers_on_item_type[{i}]">
                    <Form.Control let:attrs>
                        <div class="flex items-center gap-2">
                            <Input 
                                type="text" 
                                spellcheck="false" 
                                autocomplete="false" 
                                {...attrs} 
                                bind:value={$formData.dossiers_on_item_type[i].label} 
                            />
                            <div class="flex items-center gap-2">
                                <!-- Bouton supprimer -->
                                <Form.Button 
                                    type="button" 
                                    size="sm" 
                                    variant="destructive" 
                                    on:click={async () => {
                                        const itemToDelete = $formData.dossiers_on_item_type[i];
                                        const label = itemToDelete?.label;
                                        console.log('Label de l\'élément à supprimer:', label);

                                        if (label) {
                                            const settingId = encodeURIComponent(label);
                                            if (confirm(`Êtes-vous sûr de vouloir supprimer l'application "${label}" ?`)) {
                                                try {
                                                    const response = await fetch(`/settings/delete?setting_id=${settingId}`, {
                                                        method: 'DELETE',
                                                        headers: {
                                                            'Content-Type': 'application/json'
                                                        }
                                                    });

                                                    const data = await response.json();
                                                    console.log('Réponse complète de l\'API :', data);

                                                    if (data.message === 'Settings deleted successfully.') {
                                                        console.log('Élément supprimé avec succès.');

                                                        // Mise à jour du tableau dossiers_on_item_type
                                                        $formData = {
                                                            ...$formData,
                                                            dossiers_on_item_type: $formData.dossiers_on_item_type.filter((_, index) => index !== i)
                                                        };

                                                        // Suppression dans authentification
                                                        const updatedAuthentification = { ...$formData.authentification };
                                                        delete updatedAuthentification[label];
                                                        $formData = { ...$formData, authentification: updatedAuthentification };

                                                        // Suppression dans domaine
                                                        const updatedDomaine = { ...$formData.domaine };
                                                        delete updatedDomaine[label];
                                                        $formData = { ...$formData, domaine: updatedDomaine };

                                                        console.log('Données après suppression:', $formData);

                                                        const scriptName = 'suppression';

                                                        const scriptEvent = new CustomEvent('startScript', { 
                                                            detail: { 
                                                                scriptName, 
                                                                label 
                                                         } 
                                                       });
                                                        window.dispatchEvent(scriptEvent);
                                                        console.log(`Lancement du script ${scriptName}.sh pour l'application: ${label}`);                   

                                                    } else {
                                                        console.error('Erreur de suppression:', data.message);
                                                    }
                                                } catch (error) {
                                                    console.error('Erreur lors de la suppression:', error);
                                                }
                                            }
                                        } else {
                                            console.error('L\'élément à supprimer n\'est pas défini ou n\'a pas de label.');
                                        }
                                    }}
                                >
                                    <Trash2 class="h-4 w-4" />
                                </Form.Button>

                                <!-- Bouton réinitialiser -->
                                <Form.Button 
                                    type="button" 
                                    title="Réinitialiser l'Application" 
                                    size="sm" 
                                    variant="reinitialiser" 
                                    on:click={async () => {
                                        const itemToReinitialize = $formData.dossiers_on_item_type[i];
                                        const label = itemToReinitialize?.label;
                                        console.log('Label de l\'élément à réinitialiser:', label);
                                    if (label) {
                                        try {
                                            const scriptName = 'reinitialiser';
                                            const scriptEvent = new CustomEvent('startScript', { 
                                                detail: { 
                                                    scriptName, 
                                                    label 
                                                } 
                                            });
                                            window.dispatchEvent(scriptEvent);
                                            console.log(`Lancement du script ${scriptName}.sh pour l'application: ${label}`);
                                        } catch (error) {
                                            console.error('Erreur lors du lancement du script:', error);
                                        }
                                    } else {
                                        console.error("L'application à réinitialiser n'a pas de label.");
                                    }
                                }}
                                >
                                    <RefreshCw class="h-4 w-4" />
                                </Form.Button>
                            </div>
                        </div>
                    </Form.Control>
                </Form.ElementField>
            {/each}
        </ArrayField>
    </div>
{/if}

    <!-- Champ de saisie visible pour domaine -->
    <div class="mt-4">
        {#if selectedItem?.label}
            <div class="flex items-center" transition:slide>
                <!-- Label centré verticalement avec flexbox -->
                <label for="domaine" class="text-sm font-medium" style="width: 150px;">
                    Sous domaine
                    <span class="block text-sm text-gray-500">Default : {selectedItem.label}</span>
                </label>
                <!-- Champ de saisie avec le même espacement et style -->
                <input 
                    type="text" 
                    name="domaine[{selectedItem.label}]" 
                    id="domaine" 
                    placeholder="Sous domaine personnalisé"
                    class="inline-block shadow-sm sm:text-sm border border-gray-300 rounded-md"
                    style="width: 225px; height: 37px; margin-left: 44px; padding-left: 10px; outline: none;"
                    bind:value={$formData.domaine[selectedItem.label]}
                />
            </div>
        {/if}
    </div>
{/if}

    <input type="hidden" name="domaine" value={JSON.stringify(formData.domaine)} />
    <input type="hidden" name="selectedItemId" value={selectedItem?.id} />
    <input type="hidden" name="selectedItemLabel" value={selectedItem?.label} />

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
                    <span class="ml-1" class:hidden={$page.url.pathname === '/settings/applications'}>
                        et continuer
                    </span>
                {/if}
            </Form.Button>
        </div>
    </div>
</form>

<!-- Composant RunScript pour exécuter le script et gérer son état -->
<RunScript scriptName={scriptName} label={selectedItem?.label} {showLogs} on:buttonStateChange={updateButtonState} on:statusMessageUpdate={updateStatusMessage} />


{#if formDebug}
	<SuperDebug data={$formData} />
{/if}


