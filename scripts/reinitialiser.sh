#!/bin/bash
  source /home/${USER}/seedbox-compose/profile.sh

# Chemin vers le fichier JSON
json_file="/home/${USER}/projet-riven/riven-frontend/static/settings.json"

# Vérifie si le fichier existe
if [ ! -f "$json_file" ]; then
    echo "Le fichier $json_file n'existe pas."
    exit 1
fi

  line=$1
  log_write "Reinit du container ${line}" >/dev/null 2>&1
  echo -e "\e[32m"$(gettext "Les volumes ne seront pas supprimés")"\e[0m" 
  subdomain=$(get_from_account_yml "sub.${line}.${line}")

  suppression_appli "${line}"
  echo ""
  if [[ "${line}" = zurg ]]; then
    launch_service ${line}
    ansible-playbook "${SETTINGS_SOURCE}/includes/config/roles/rclone/tasks/main.yml"
  else
    source /home/${USER}/projet-riven/riven-frontend/scripts/install.sh ${line}
  fi
