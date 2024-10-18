#!/bin/bash

source /home/${USER}/seedbox-compose/profile.sh

json_file="/home/${USER}/projet-riven/riven-frontend/static/settings.json"

if [[ "${line}" == "plex" ]]; then
    # Extraire les valeurs JSON
    token=$(jq -r '.updaters.plex.token // empty' "$json_file")
    ident=$(jq -r '.updaters.plex.login // empty' "$json_file")
    sesame=$(jq -r '.updaters.plex.password // empty' "$json_file")

    # Fournir des valeurs par défaut si elles sont manquantes
    defaults=(
        "token:default-token"
        "ident:default-ident"
        "sesame:default-sesame"
    )

    # Liste des autres configurations Plex
    plex_configs=(
        "open_main_ports:yes"
        "open_extra_ports:yes"
        "force_auto_adjust_quality:no"
        "force_high_output_bitrates:no"
        "db_cache_size:1000000"
        "transcodes:/mnt/transcodes"
    )

    # Gestion des valeurs par défaut pour token, login, password
    for item in "${defaults[@]}"; do
        key="${item%%:*}"
        default_value="${item##*:}"

        value=$(eval echo \$$key)
        value="${value:-$default_value}"

        echo "Info: ${key^} Plex par défaut utilisé" [ "$value" == "$default_value" ] && echo " (Aucune valeur trouvée)"
        
        manage_account_yml "plex.$key" "$value"
    done

    # Gestion des autres configurations Plex
    for config in "${plex_configs[@]}"; do
        key="${config%%:*}"
        value="${config##*:}"

        manage_account_yml "plex.$key" "$value"
    done
fi

    auth=$(jq -r --arg line "$line" '.dossiers.authentification[$line] // "empty"' "$json_file")
    echo $auth
    domaine=$(jq -r --arg line "$line" '.dossiers.domaine[$line] // ""' "$json_file")
    echo $domaine

manage_account_yml sub.${line}.${line} "$domaine"
manage_account_yml sub.${line}.auth "$auth"

if [[ -f "${SETTINGS_STORAGE}/vars/${line}.yml" ]]; then
    ansible-playbook "${SETTINGS_SOURCE}/includes/dockerapps/generique.yml" --extra-vars "@${SETTINGS_STORAGE}/vars/${line}.yml" 2>/dev/null
elif [[ -f "${SETTINGS_SOURCE}/includes/dockerapps/${line}.yml" ]]; then
    ansible-playbook "${SETTINGS_SOURCE}/includes/dockerapps/${line}.yml" 2>/dev/null
elif [[ -f "${SETTINGS_SOURCE}/includes/dockerapps/vars/${line}.yml" ]]; then
    ansible-playbook "${SETTINGS_SOURCE}/includes/dockerapps/generique.yml" --extra-vars "@${SETTINGS_SOURCE}/includes/dockerapps/vars/${line}.yml" 2>/dev/null
else
    log_write "Aucun fichier de configuration trouvé dans les sources, abandon"
    error=1
fi

echo "Installation de ${line} terminée avec succès."

exit 0
