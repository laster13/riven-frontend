#!/bin/bash
  source /home/${USER}/seedbox-compose/profile.sh

  line=$1
  suppression_appli ${line} 1

# Fin du script
  exit 0
