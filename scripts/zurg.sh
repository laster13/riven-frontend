#!/bin/bash

source /home/${USER}/seedbox-compose/profile.sh

# Variables de chemins
json_file="/home/${USER}/projet-riven/riven/data/settings.json"
scripts_dir="${HOME}/scripts/zurg"
config_dir="${HOME}/.config/rclone"

sudo rm releases.json 2>/dev/null

# Récupération des variables depuis le fichier JSON
ZURG_TOKEN=$(jq -r '.downloaders.real_debrid.api_key // empty' "$json_file")

# Téléchargement des informations de la dernière version
wget -q https://api.github.com/repos/debridmediamanager/zurg-testing/releases -O releases.json

# Versions actuelles et dernières versions
CURRENT_VERSION=$(get_from_account_yml zurg.version)
LATEST_VERSION=$(jq -r '.[0].tag_name' releases.json)
sudo rm releases.json

# Comparaison des versions
if [[ ${CURRENT_VERSION} == notfound ]] || [[ ${CURRENT_VERSION} != ${LATEST_VERSION} ]]; then
    manage_account_yml zurg.version "${LATEST_VERSION}"
    echo -e "${BLUE}Version Zurg mise à jour : ${LATEST_VERSION}${CEND}"
else
    echo -e "${BLUE}Version Zurg à jour : ${LATEST_VERSION}${CEND}"
fi

# Architecture et version
ARCHITECTURE=$(dpkg --print-architecture)
RCLONE_VERSION=$(get_from_account_yml rclone.architecture)
ZURG_VERSION=$(get_from_account_yml zurg.version)

# Création du répertoire de configuration si nécessaire
create_dir "${config_dir}"

# Vérification de la version Rclone et mise à jour si nécessaire
if [[ ${RCLONE_VERSION} == notfound ]]; then
    manage_account_yml rclone.architecture "${ARCHITECTURE}"
fi

# Nettoyage des dossiers et containers Docker existants
sudo rm -rf "${scripts_dir}" > /dev/null 2>&1

# Création du répertoire et téléchargement de Zurg
mkdir -p "${scripts_dir}" && cd "${scripts_dir}"
wget -q "https://github.com/debridmediamanager/zurg-testing/releases/download/${ZURG_VERSION}/zurg-${ZURG_VERSION}-linux-${ARCHITECTURE}.zip"

# Décompression de l'archive Zurg
unzip -q "zurg-${ZURG_VERSION}-linux-${ARCHITECTURE}.zip"
sudo rm "zurg-${ZURG_VERSION}-linux-${ARCHITECTURE}.zip"

# Vérification du token Zurg
ZURG_TOKEN=$(get_from_account_yml zurg.token)
if [[ ${ZURG_TOKEN} == notfound ]]; then
    manage_account_yml zurg.token "${ZURG_TOKEN}"
else
    echo -e "${BLUE}Token Zurg déjà renseigné${CEND}"
fi

# Lancement des playbooks Ansible pour Zurg et Rclone
ansible-playbook "${SETTINGS_SOURCE}/includes/config/playbooks/zurg.yml"
ansible-playbook "${SETTINGS_SOURCE}/includes/config/roles/rclone/tasks/main.yml"

# Indication de la fin du script
echo "Installation et configuration de Zurg terminées avec succès."

exit 0
