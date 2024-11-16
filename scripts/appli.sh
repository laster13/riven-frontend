#!/bin/bash

source /home/${USER}/seedbox-compose/profile.sh

# Chemins et variables
json_file="${HOME}/projet-riven/riven/data/settings.json"
compose_file="${HOME}/projet-riven/riven-frontend/scripts/docker-compose.yml"
compose_file="docker-compose.yml"
line=$1

# Fonction pour générer le fichier docker-compose.yml pour stream-fusion
generate_compose_file() {
    echo "Création du fichier .env avec les variables d'environnement..."

    # Génération du fichier .env
    cat <<EOF > ${HOME}/projet-riven/riven-frontend/scripts/.env
SECRET_API_KEY=$(jq -r '.scraping.yggflix.secret_api_key // "default-secret"' "$json_file")
TMDB_API_KEY=$(jq -r '.scraping.yggflix.tmdb_api_key // "default-tmdb"' "$json_file")
RD_TOKEN=$(jq -r '.downloaders.real_debrid.api_key // ""' "$json_file")
AD_TOKEN=$(jq -r '.downloaders.all_debrid.api_key // ""' "$json_file")
YGG_PASSKEY=$(jq -r '.scraping.yggflix.ygg_passkey // ""' "$json_file")
POSTGRES_USER=stremio
POSTGRES_PASSWORD=stremio
POSTGRES_DB=zilean
REDIS_HOST=stremio-redis
POSTGRES_HOST=stremio-postgres
USE_HTTPS=True
PROXY_URL='http://warp:1080'
TZ=Europe/Paris
EOF

    echo "Fichier .env créé avec succès."

    echo "Création du fichier docker-compose.yml..."

    # Génération du fichier docker-compose.yml
    cat <<EOF > ${HOME}/projet-riven/riven-frontend/scripts/docker-compose.yml
networks:
  traefik_proxy:
    external: true

services:

  warp:
    image: caomingjun/warp
    container_name: warp
    restart: always
    expose:
      - 1080
    environment:
      - WARP_SLEEP=2
    cap_add:
      - NET_ADMIN
    sysctls:
      - net.ipv6.conf.all.disable_ipv6=0
      - net.ipv4.conf.all.src_valid_mark=1
    volumes:
      - ./warp-data:/var/lib/cloudflare-warp
    networks:
      - traefik_proxy

  streamfusion:
    image: ghcr.io/laster13/stream-fusion:riven
    container_name: streamfusion
    environment:
      SECRET_API_KEY: \${SECRET_API_KEY:?Please provide a secret API key in the environment}
      TMDB_API_KEY: \${TMDB_API_KEY:?Please provide a TMDB API key in the environment}
      RD_TOKEN: \${RD_TOKEN:-''}
      AD_TOKEN: \${AD_TOKEN:-''}
      YGG_PASSKEY: \${YGG_PASSKEY:-''}
      SHAREWOOD_PASSKEY: \${SHAREWOOD_PASSKEY:-''}
      REDIS_HOST: \${REDIS_HOST:-stremio-redis}
      PG_HOST: \${POSTGRES_HOST:-stremio-postgres}
      PG_USER: \${POSTGRES_USER:-stremio}
      PG_PASS: \${POSTGRES_PASSWORD:-stremio}
      USE_HTTPS: \${USE_HTTPS:-True}
      PROXY_URL: \${PROXY_URL:-'http://warp:1080'}
      TZ: \${TZ:-Europe/Paris}
    ports:
      - 8081:8080
    volumes:
      - stream-fusion:/app/config
    depends_on:
      - stremio-postgres
      - stremio-redis
      - zilean
    restart: unless-stopped
    networks:
      - traefik_proxy

  stremio-redis:
    image: redis:latest
    container_name: stremio-redis
    expose:
      - 6379
    volumes:
      - stremio-redis:/data
    command: redis-server --appendonly yes
    restart: unless-stopped
    networks:
      - traefik_proxy

  zilean:
    image: ipromknight/zilean:latest
    container_name: zilean
    restart: unless-stopped
    ports:
      - 8181:8181
    volumes:
      - zilean_data:/app/data
    environment:
      Zilean__Database__ConnectionString: \${ZILEAN_DB_CONNECTION_STRING:-Host=stremio-postgres;Port=5432;Database=zilean;Username=stremio;Password=stremio}
      Zilean__Dmm__ImportBatched: \${ZILEAN_DMM_IMPORT_BATCHED:-True}
      Zilean__Dmm__MaxFilteredResults: \${ZILEAN_DMM_MAX_FILTERED_RESULTS:-200}
      Zilean__Dmm__MinimumScoreMatch: \${ZILEAN_DMM_MINIMUM_SCORE_MATCH:-0.85}
      Zilean__Imdb__EnableEndpoint: \${ZILEAN_IMDB_ENABLE_ENDPOINT:-False}
      Zilean__Imdb__EnableImportMatching: \${ZILEAN_IMDB_ENABLE_IMPORT_MATCHING:-False}
    depends_on:
      - stremio-postgres
    networks:
      - traefik_proxy

  stremio-postgres:
    image: postgres:16.3-alpine3.20
    container_name: stremio-postgres
    restart: unless-stopped
    environment:
      PGDATA: /var/lib/postgresql/data/pgdata
      POSTGRES_USER: \${POSTGRES_USER:-stremio}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-stremio}
      POSTGRES_DB: \${POSTGRES_DB:-zilean}
    expose:
      - 5432
    volumes:
      - stremio_postgres:/var/lib/postgresql/data/pgdata
    networks:
      - traefik_proxy

volumes:
  stremio_postgres:
  stremio-redis:
  stream-fusion:
  zilean_data:
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
            generate_compose_file
            docker compose up -d 2>/dev/null
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
