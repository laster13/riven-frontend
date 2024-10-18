#!/bin/bash

  source /home/${USER}/seedbox-compose/profile.sh
  get_architecture

  # Chemin vers le fichier JSON
  json_file="/home/${USER}/projet-riven/riven/data/settings.json"

  # Vérifie si le fichier existe
  if [ ! -f "$json_file" ]; then
      echo "Le fichier $json_file n'existe pas."
      exit 1
  fi

  # Extraire les valeurs du fichier JSON et les assigner à des variables avec jq
  username=$(jq -r '.utilisateur.username' "$json_file")
  email=$(jq -r '.utilisateur.email' "$json_file")
  domain=$(jq -r '.utilisateur.domain' "$json_file")
  password=$(jq -r '.utilisateur.password' "$json_file")
  authMethod=$(jq -r '.utilisateur.traefik.authMethod' "$json_file")
  domainperso=$(jq -r '.utilisateur.domainperso' "$json_file")
  cloudflare_login=$(jq -r '.cloudflare.cloudflare_login' "$json_file")
  cloudflare_api_key=$(jq -r '.cloudflare.cloudflare_api_key' "$json_file")
  oauth_client=$(jq -r '.utilisateur.traefik.oauth_client' "$json_file")
  oauth_secret=$(jq -r '.utilisateur.traefik.oauth_secret' "$json_file")
  oauth_mail=$(jq -r '.utilisateur.traefik.oauth_mail' "$json_file")

  # Mise à jour fichier all.yml avec les données
  manage_account_yml user.name "$username"
  manage_account_yml user.mail "$email"
  manage_account_yml user.domain "$domain"
  manage_account_yml user.pass "$password"
  manage_account_yml cloudflare.login "$cloudflare_login"
  manage_account_yml cloudflare.api "$cloudflare_api_key"
  manage_account_yml sub.traefik.auth "$authMethod"
  manage_account_yml sub.traefik.traefik "$domainperso"

  if [ "$authMethod" == "oauth" ]; then
    # Applique les paramètres OAuth
    openssl=$(openssl rand -hex 16)
    manage_account_yml oauth.openssl "$openssl"
    manage_account_yml oauth.client "$oauth_client"
    manage_account_yml oauth.secret "$oauth_secret"
    manage_account_yml oauth.account "$oauth_mail"
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

# Installation traefik
ansible-playbook ${SETTINGS_SOURCE}/includes/dockerapps/traefik.yml

# Obtenir l'IP publique
ip=$(curl -s ifconfig.me)

# Obtenir le Zone ID via le nom de domaine
response=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=$domain" \
-H "X-Auth-Email: $email" \
-H "X-Auth-Key: $cloudflare_api_key" \
-H "Content-Type: application/json")

# Afficher la réponse brute pour le débogage
echo "Réponse de l'API pour le zone_id :"
echo "$response"

# Extraire le zone_id de la réponse
zone_id=$(echo $response | jq -r '.result[0].id')

# Vérification si le zone_id est valide
if [ -z "$zone_id" ] || [ "$zone_id" == "null" ]; then
    echo "Erreur : Impossible de récupérer le zone_id. Vérifiez que le domaine est correct et que l'API Key a les bons droits."
    exit 1
fi

echo "Zone ID : $zone_id"

# Ajouter l'enregistrement DNS pour le sous-domaine
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records" \
-H "X-Auth-Email: $email" \
-H "X-Auth-Key: $cloudflare_api_key" \
-H "Content-Type: application/json" \
--data "{
    \"type\": \"A\",
    \"name\": \"webui.$domain\",
    \"content\": \"$ip\",
    \"ttl\": 120,
    \"proxied\": true
}"

echo "Infos mise à jour avec succès."


