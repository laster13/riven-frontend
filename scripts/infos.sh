#!/bin/bash

  source $HOME/seedbox-compose/profile.sh
  get_architecture

  # Chemin vers le fichier JSON
  json_file="/home/${USER}/projet-riven/riven/data/settings.json"

  # Vérifie si le fichier existe
  if [ ! -f "$json_file" ]; then
      echo "Le fichier $json_file n'existe pas."
      exit 1
  fi

  # Extraire les valeurs du fichier JSON et les assigner à des variables avec jq
  realdebrid=$(jq -r '.downloaders.real_debrid.api_key' "$json_file")
  username=$(jq -r '.utilisateur.username' "$json_file")
  email=$(jq -r '.utilisateur.email' "$json_file")
  domain=$(jq -r '.utilisateur.domain' "$json_file")
  password=$(jq -r '.utilisateur.password' "$json_file")
  domainperso=$(jq -r '.utilisateur.domainperso' "$json_file")
  cloudflare_login=$(jq -r '.cloudflare.cloudflare_login' "$json_file")
  cloudflare_api_key=$(jq -r '.cloudflare.cloudflare_api_key' "$json_file")
  oauth_enabled=$(jq -r '.utilisateur.oauth_enabled' "$json_file")
  oauth_client=$(jq -r '.utilisateur.oauth_client' "$json_file")
  oauth_secret=$(jq -r '.utilisateur.oauth_secret' "$json_file")
  oauth_mail=$(jq -r '.utilisateur.oauth_mail' "$json_file")
  zurg_enabled=$(jq -r '.utilisateur.zurg_enabled' "$json_file")
  zurg_token=$(jq -r '.utilisateur.zurg_token' "$json_file")

  # Mise à jour fichier all.yml avec les données
  manage_account_yml zurg.token "$realdebrid"
  manage_account_yml user.name "$username"
  manage_account_yml user.mail "$email"
  manage_account_yml user.domain "$domain"
  manage_account_yml user.pass "$password"
  manage_account_yml cloudflare.login "$cloudflare_login"
  manage_account_yml cloudflare.api "$cloudflare_api_key"

  # oauth
  if [[ "$oauth_enabled" == true ]]; then
    # Applique les paramètres OAuth
    openssl=$(openssl rand -hex 16)
    manage_account_yml oauth.openssl "$openssl"
    manage_account_yml oauth.client "$oauth_client"
    manage_account_yml oauth.secret "$oauth_secret"
    manage_account_yml oauth.account "$oauth_mail"

  echo '---
  - name: "Wrapper Playbook for OAuth Setup"
    hosts: all
    vars_files:
      - "{{ settings.source }}/includes/dockerapps/templates/generique/generique.yml"
    tasks:
      - name: "Include the OAuth playbook"
        include_tasks: oauth.yml
  ' > $HOME/seedbox-compose/includes/dockerapps/templates/traefik/run-oauth.yml

  ansible-playbook $HOME/seedbox-compose/includes/dockerapps/templates/traefik/run-oauth.yml

  fi
  
  # zurg
  if [[ "$zurg_enabled" == true && -n "$zurg_token" ]]; then
    # Lancer le script si les conditions sont remplies
    manage_account_yml zurg.sponsor "$zurg_token"
    $HOME/projet-riven/riven-frontend/scripts/zurg.sh
  elif [[ "$zurg_enabled" == false ]]; then
    # Ne rien faire si zurg_enabled est false
    echo "zurg_enabled est désactivé. Aucune action effectuée."
  else
    $HOME/projet-riven/riven-frontend/scripts/zurg_public.sh
  fi

  # creation utilisateur
  userid=$(id -u)
  grpid=$(id -g)
  # on reprend les valeurs du account.yml, juste au cas où
  user=$(get_from_account_yml user.name)
  pass=$(get_from_account_yml user.pass)
  manage_account_yml user.htpwd $(htpasswd -nb $user $pass)
  manage_account_yml user.userid "$userid"
  manage_account_yml user.groupid "$grpid"

  echo "Infos mise à jour avec succès."


