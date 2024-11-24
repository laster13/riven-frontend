#!/bin/bash

source /home/${USER}/seedbox-compose/profile.sh

sudo rm -rf $HOME/scripts/zurg*/

function install_zurg() {
  update_release_zurg

  # Déterminer l'architecture système
  ARCHITECTURE=$(dpkg --print-architecture)

  # Obtenir la version Zurg et Rclone depuis le fichier de configuration
  RCLONE_VERSION=$(get_from_account_yml rclone.architecture)
  ZURG_VERSION=$(get_from_account_yml zurg.version)

  # Créer le répertoire de configuration si nécessaire
  create_dir "${HOME}/.config/rclone"
  if [ "$RCLONE_VERSION" == "notfound" ]; then
    manage_account_yml rclone.architecture "$ARCHITECTURE"
  fi

  # Nettoyer et préparer l'environnement
  rm -rf "${HOME}/scripts/zurg" > /dev/null 2>&1
  docker rm -f zurg > /dev/null 2>&1
  docker system prune -af > /dev/null 2>&1

  # Obtenir le nom exact de l'asset pour le format de l'architecture et version
    ASSET_NAME=$(jq -r --arg ZURG_VERSION "$ZURG_VERSION" --arg ARCHITECTURE "$ARCHITECTURE" \
    '.[] | select(.tag_name == $ZURG_VERSION) | .assets[] | select(.name | test("zurg-" + $ZURG_VERSION + "-linux-" + $ARCHITECTURE + "\\.zip")) | .name' releases.json)

  if [[ -z "$ASSET_NAME" ]]; then
    echo "Erreur : Aucun asset trouvé pour ${ZURG_VERSION} et l'architecture ${ARCHITECTURE}."
    exit 1
  fi

  DOWNLOAD_URL="https://github.com/debridmediamanager/zurg-testing/releases/download/${ZURG_VERSION}/${ASSET_NAME}"

  # Créer le répertoire cible et y naviguer
  mkdir -p "${HOME}/scripts/zurg" && cd "${HOME}/scripts/zurg"

  # Télécharger l'asset avec wget
  echo "Téléchargement de ${ASSET_NAME} depuis ${DOWNLOAD_URL}..."
  wget -O "${ASSET_NAME}" "${DOWNLOAD_URL}" > /dev/null 2>&1

  # Extraire l'archive téléchargée
  echo "Extraction de ${ASSET_NAME}..."
  unzip "$ASSET_NAME" -d "${HOME}/scripts/zurg" > /dev/null 2>&1
  rm "$ASSET_NAME" 2>/dev/null

  # Vérifier et obtenir le token Zurg si nécessaire
  ZURG_TOKEN=$(get_from_account_yml zurg.token)

  # launch zurg
  ansible-playbook "${SETTINGS_SOURCE}/includes/config/playbooks/zurg.yml" 2>/dev/null
  ansible-playbook "${SETTINGS_SOURCE}/includes/config/roles/rclone/tasks/main.yml" 2>/dev/null

  # Nettoyer le fichier temporaire
  sudo rm $HOME/projet-riven/riven-frontend/scripts/releases.json 2>/dev/null
}

function update_release_zurg() {
  # Télécharger les informations sur les releases depuis GitHub
  wget -O releases.json https://api.github.com/repos/debridmediamanager/zurg-testing/releases 2>/dev/null

  # Récupérer la dernière version
  CURRENT_VERSION=$(get_from_account_yml zurg.version)
  LATEST_VERSION=$(jq -r '.[0].tag_name' releases.json)

  # Mettre à jour la version si nécessaire
  if [[ "$CURRENT_VERSION" == "notfound" ]] || [[ "$CURRENT_VERSION" != "$LATEST_VERSION" ]]; then
    manage_account_yml zurg.version "$LATEST_VERSION"
    echo "Version Zurg mise à jour : $LATEST_VERSION"
  else 
    echo "Version Zurg actuelle : $LATEST_VERSION"
  fi
}

# Exécuter l'installation
install_zurg
