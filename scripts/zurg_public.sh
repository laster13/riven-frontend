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

  # Installer GitHub CLI si nécessaire
  if ! command -v gh &> /dev/null; then
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg 2>/dev/null
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    sudo apt update 2>/dev/null
    sudo apt install gh -y 2>/dev/null
  fi

  # Obtenir le nom exact de l'asset pour le format de l'architecture et version
  ASSET_NAME=$(gh release view "$ZURG_VERSION" --repo debridmediamanager/zurg-testing --json assets --jq ".assets[] | select(.name | test(\"zurg-${ZURG_VERSION}-linux-${ARCHITECTURE}.zip\")) | .name")

  if [[ -z "$ASSET_NAME" ]]; then
    echo "Erreur : Aucun asset trouvé pour ${ZURG_VERSION} et l'architecture ${ARCHITECTURE}."
    exit 1
  fi

  # Créer le répertoire cible et y naviguer
  mkdir -p "${HOME}/scripts/zurg" && cd "${HOME}/scripts/zurg"

  # Télécharger et extraire l'asset
  gh release download "$ZURG_VERSION" --repo debridmediamanager/zurg-testing --pattern "$ASSET_NAME" 2>/dev/null
  unzip "$ASSET_NAME" -d "${HOME}/scripts/zurg" > /dev/null 2>&1
  rm "$ASSET_NAME" 2>/dev/null

  # Vérifier et obtenir le token Zurg si nécessaire
  ZURG_TOKEN=$(get_from_account_yml zurg.token)

  # launch zurg
  ansible-playbook "${SETTINGS_SOURCE}/includes/config/playbooks/zurg.yml" 2>/dev/null
  ansible-playbook "${SETTINGS_SOURCE}/includes/config/roles/rclone/tasks/main.yml" 2>/dev/null
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

  # Nettoyer le fichier temporaire
  sudo rm releases.json 2>/dev/null
}

# Exécuter l'installation
install_zurg