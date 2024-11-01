#!/bin/bash

source /home/${USER}/seedbox-compose/profile.sh

# Chemins et variables
json_file="${HOME}/projet-riven/riven-frontend/static/settings.json"
compose_file="${HOME}/projet-riven/riven-frontend/scripts/docker-compose.yml"
compose_file="docker-compose.yml"
line=$1

# Fonction pour générer le fichier docker-compose.yml pour stream-fusion
generate_compose_file() {
    echo "Création du fichier docker-compose.yml pour stream-fusion..."

    cat <<EOF > ${HOME}/projet-riven/riven-frontend/scripts/docker-compose.yml
networks:
  proxy_network:
    external: true

services:
  stream-fusion:
    image: ghcr.io/limedrive/stream-fusion:latest
    container_name: stream-fusion
    environment:
      SECRET_API_KEY: ${secret_api_key}
      TMDB_API_KEY: ${tmdb_api_key}
      RD_TOKEN: ${rd_token}
      AD_TOKEN: ${ad_token}
      YGG_PASSKEY: ${ygg_passkey}
      REDIS_HOST: 'stremio-redis'
      TZ: 'Europe/Paris'
    volumes:
      - stream-fusion:/app/config
    restart: unless-stopped
    networks:
      - proxy_network

volumes:
  stream-fusion:
EOF

    echo "Fichier docker-compose.yml créé avec succès."
}

# Fonction pour extraire les informations de domaine et d'authentification
extract_domaine_auth() {
    local line="$1"
    auth=$(jq -r --arg line "$line" '.dossiers.authentification[$line] // "empty"' "$json_file")
    domaine=$(jq -r --arg line "$line" '.dossiers.domaine[$line] // ""' "$json_file")
    echo "Authentification : $auth"
    echo "Domaine : $domaine"
}

# Fonction pour gérer les configurations spécifiques à Plex
configure_plex() {
    token=$(jq -r '.updaters.plex.token // empty' "$json_file")
    ident=$(jq -r '.updaters.plex.login // empty' "$json_file")
    sesame=$(jq -r '.updaters.plex.password // empty' "$json_file")
    url=$(jq -r '.updaters.plex.url // empty' "$json_file")

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
}

# Fonction pour gérer les configurations spécifiques à stream-fusion
configure_stream_fusion() {
    secret_api_key=$(jq -r '.scraping.yggflix.secret_api_key // "default-secret"' "$json_file")
    tmdb_api_key=$(jq -r '.scraping.yggflix.secret_api_key // "default-tmdb"' "$json_file")
    rd_token=$(jq -r '.downloaders.real_debrid.api_key // ""' "$json_file")
    ad_token=$(jq -r '.downloaders.all_debrid.api_key // ""' "$json_file")
    ygg_passkey=$(jq -r '.scraping.yggflix.ygg_passkey // ""' "$json_file")

    # Applique les configurations et génère le fichier docker-compose.yml
    generate_compose_file
}

# Fonction pour exécuter le bon playbook Ansible en fonction des fichiers disponibles
run_playbook() {
    local line="$1"

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
}

# Fonction principale d'installation de l'application
install_application() {
    local line="$1"
    extract_domaine_auth "$line"
    
    case "$line" in
        "plex")
            configure_plex
            run_playbook "$line"
            ;;
        "streamfusion")
            cd ${HOME}/projet-riven/riven-frontend/scripts
            configure_stream_fusion
            docker compose up -d
            echo "terminé"
            return
            ;;
        *)
            run_playbook "$line"
            ;;
    esac

    manage_account_yml sub.${line}.${line} "$domaine"
    manage_account_yml sub.${line}.auth "$auth"

    if [[ "$line" != "stream-fusion" && $error -eq 0 ]]; then
        echo "Installation de ${line} terminée avec succès."
    elif [[ "$line" == "stream-fusion" ]]; then
        echo "Déploiement de stream-fusion terminé avec succès via Docker Compose."
    else
        echo "Erreur lors de l'installation de ${line}."
    fi
}

# Vérification et exécution de la fonction principale
if [[ -z "$line" ]]; then
    echo "Erreur : veuillez fournir un argument (plex, stream-fusion, ou autre application générique)."
    exit 1
else
    install_application "$line"
fi

exit 0
