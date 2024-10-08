#!/bin/bash

source /home/laster13/seedbox-compose/profile.sh

json_file="/home/laster13/projet-riven/riven-frontend/static/settings.json"


app_count=$(jq '.applications | length' $json_file)

if [ "$app_count" -gt 0 ]; then
    line=$1

    auth=$(jq -r --arg label "$line" '.dossiers.authentification[$label] // empty' $json_file)
    domaine=$(jq -r --arg label "$line" '.dossiers.domaine[$label] // ""' $json_file)

    # Si l'utilisateur a déjà sélectionné une authentification (comme "Oauth"), ne pas remplacer par "Basique"
    if [ -z "$auth" ]; then
        auth="Basique"
    else
        echo "Info: pour $line."
    fi

    if [ -z "$domaine" ]; then
        echo "Info: "
    fi
else
    exit 1
fi

if [[ "${line}" == "plex" ]]; then
    token=$(jq -r '.updaters.plex.token // empty' $json_file)
    login=$(jq -r '.updaters.plex.login // empty' $json_file)
    password=$(jq -r '.updaters.plex.password // empty' $json_file)

    # Si des valeurs manquent, fournir des valeurs par défaut
    token="${token:-default-token}"
    login="${login:-default-login}"
    password="${password:-default-password}"

    echo "Info: Token Plex par défaut utilisé" [ "$token" == "default-token" ] && echo " (Aucune valeur trouvée)"
    echo "Info: Login Plex par défaut utilisé" [ "$login" == "default-login" ] && echo " (Aucune valeur trouvée)"
    echo "Info: Password Plex par défaut utilisé" [ "$password" == "default-password" ] && echo " (Aucune valeur trouvée)"

    manage_account_yml plex.token "$token"
    manage_account_yml plex.ident "$login"
    manage_account_yml plex.sesame "$password"
fi

manage_account_yml sub.${line}.${line} "$domaine"
manage_account_yml sub.${line}.auth "$auth"

if [[ -f "${SETTINGS_STORAGE}/vars/${line}.yml" ]]; then
    ansible-playbook "${SETTINGS_SOURCE}/includes/dockerapps/generique.yml" --extra-vars "@${SETTINGS_STORAGE}/vars/${line}.yml"
elif [[ -f "${SETTINGS_SOURCE}/includes/dockerapps/${line}.yml" ]]; then
    ansible-playbook "${SETTINGS_SOURCE}/includes/dockerapps/${line}.yml"
elif [[ -f "${SETTINGS_SOURCE}/includes/dockerapps/vars/${line}.yml" ]]; then
    ansible-playbook "${SETTINGS_SOURCE}/includes/dockerapps/generique.yml" --extra-vars "@${SETTINGS_SOURCE}/includes/dockerapps/vars/${line}.yml"
else
    log_write "Aucun fichier de configuration trouvé dans les sources, abandon"
    error=1
fi

exit 0
