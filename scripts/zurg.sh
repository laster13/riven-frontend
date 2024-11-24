#!/bin/bash

  source /home/${USER}/seedbox-compose/profile.sh

  sudo rm -rf $HOME/scripts/zurg*/

function install_zurg() {
  update_release_zurg

  sleep 2s
  # Déterminer l'architecture système

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
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg 2>/dev/null
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
  sudo apt update 2>/dev/null
  sudo apt install gh -y 2>/dev/null

  # Authentification avec GitHub
  echo "$ZURG_SPONSOR" | gh auth login --with-token

  ASSET_NAME=$(jq -r --arg ZURG_VERSION "$ZURG_VERSION" --arg ARCHITECTURE "$ARCHITECTURE" '
      .[]
      | select(.tag_name == $ZURG_VERSION)
      | .assets[]
      | select(.name | test("zurg-[0-9\\.]+-nightly-linux-" + $ARCHITECTURE + "\\.zip"))
      | .name' releases.json)

  if [[ -z "$ASSET_NAME" ]]; then
    echo "Erreur : Aucun asset trouvé pour l'architecture ${ARCHITECTURE}."
    exit 1
  fi

  # Créer le répertoire cible et y naviguer
  mkdir -p "${HOME}/scripts/zurg" && cd "${HOME}/scripts/zurg"

  # Télécharger et extraire l'asset
  gh release download "$ZURG_VERSION" \
      --repo debridmediamanager/zurg \
      --pattern "$ASSET_NAME"

  unzip "$ASSET_NAME" -d "${HOME}/scripts/zurg" > /dev/null 2>&1
  rm "$ASSET_NAME" 2>/dev/null

  # Vérifier et obtenir le token Zurg si nécessaire
  ZURG_TOKEN=$(get_from_account_yml zurg.token)

  # launch zurg
  ansible-playbook "${SETTINGS_SOURCE}/includes/config/playbooks/zurg.yml" 2>/dev/null
  ansible-playbook "${SETTINGS_SOURCE}/includes/config/roles/rclone/tasks/main.yml" 2>/dev/null

  # Nettoyer le fichier temporaire
  sudo rm $HOME/projet-riven/riven-frontend/scripts/releases.json 2>/dev/null
  gh auth logout > /dev/null 2>&1
}

function update_release_zurg() {

  # Obtenir la version Zurg et Rclone depuis le fichier de configuration
  ARCHITECTURE=$(dpkg --print-architecture)
  ZURG_SPONSOR=$(get_from_account_yml zurg.sponsor)

  # Télécharger les informations sur les releases depuis GitHub
  wget --header="Authorization: token $ZURG_SPONSOR" -O releases.json https://api.github.com/repos/debridmediamanager/zurg/releases 2>/dev/null

  # Récupérer la dernière version
  ZURG_VERSION=$(jq -r '.[0].tag_name' releases.json)

  # Mettre à jour la version
    manage_account_yml zurg.version "$ZURG_VERSION"
    echo "Version Zurg mise à jour : $ZURG_VERSION"
}

# Exécuter l'installation
install_zurg
