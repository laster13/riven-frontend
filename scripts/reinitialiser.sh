#!/bin/bash
  source ${HOME}/seedbox-compose/profile.sh

  line=$1
  log_write "Reinit du container ${line}" >/dev/null 2>&1
  echo -e "\e[32m"$(gettext "Les volumes ne seront pas supprimés")"\e[0m" 

  # Suppression container & image
  docker rm -f ${line}
  docker system prune -af
 
  if [[ "${line}" = zurg ]]; then
    launch_service ${line}
    ansible-playbook "${SETTINGS_SOURCE}/includes/config/roles/rclone/tasks/main.yml" >/dev/null 2>&1
  else
    source ${HOME}/projet-riven/riven-frontend/scripts/appli.sh ${line}
  fi
