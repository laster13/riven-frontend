#!/bin/bash
INSTALL_MODE="webui"

# On change tout de suite le PATH pour la suite
  export PATH="$HOME/.local/bin:$PATH"
  export IFSORIGIN="${IFS}"

# Absolute path this script is in
  SETTINGS_SOURCE=/home/${USER}/seedbox-compose
  SETTINGS_STORAGE=/home/${USER}/seedbox
  export SETTINGS_SOURCE
  cd ${SETTINGS_SOURCE}
  source "${SETTINGS_SOURCE}/includes/functions.sh"
  source "${SETTINGS_SOURCE}/includes/menus.sh"

  mkdir -p "${HOME}/.config/ssd/"
  echo "SETTINGS_SOURCE=$HOME/seedbox-compose" >>"${HOME}/.config/ssd/env"
  echo "SETTINGS_STORAGE=$HOME/seedbox" >>"${HOME}/.config/ssd/env"
  mkdir -p ${SETTINGS_STORAGE}
  source "${HOME}/.config/ssd/env"

# lancement des fonctions
  check_docker_group
  source "${SETTINGS_SOURCE}/includes/variables.sh"

  if [ ! -f "${SETTINGS_SOURCE}/ssddb" ]; then
  sudo chown -R ${USER}: ${SETTINGS_SOURCE}/

  echo $(gettext "Certains composants doivent encore être installés/réglés")
  echo $(gettext "Cette opération va prendre plusieurs minutes selon votre système")
  echo "=================================================================="

  # Installation des paquets nécessaires
  sudo "${SETTINGS_SOURCE}/includes/config/scripts/prerequis_root.sh" "${USER}"

  # Création d'un vault_pass vide
  if [ ! -f "${HOME}/.vault_pass" ]; then
    mypass=$(
      tr -dc A-Za-z0-9 </dev/urandom | head -c 25
      echo ''
    )
    echo "$mypass" >"${HOME}/.vault_pass"
  fi

  # Création d'un virtualenv
  python3 -m venv ${SETTINGS_SOURCE}/venv

  # Activation du venv
  source ${SETTINGS_SOURCE}/venv/bin/activate

  temppath=$(ls ${SETTINGS_SOURCE}/venv/lib)
  pythonpath=${SETTINGS_SOURCE}/venv/lib/${temppath}/site-packages
  export PYTHONPATH=${pythonpath}

  # Installer les paquets Python
  python3 -m pip install --disable-pip-version-check --upgrade --force-reinstall pip
  pip install wheel
  pip install ansible docker shyaml netaddr dnspython configparser inquirer jsons colorama requests==2.31

  echo $(gettext "Installation en cours ....")

  mkdir -p ~/.ansible/inventories

  # Configuration ansible pour le user courant
  mkdir -p /etc/ansible/inventories/ 1>/dev/null 2>&1
  cat << EOF >~/.ansible/inventories/local
  [local]
  127.0.0.1 ansible_connection=local
EOF

  cat <<EOF >~/.ansible.cfg
  [defaults]
  command_warnings = False
  callback_whitelist = profile_tasks
  deprecation_warnings=False
  inventory = ~/.ansible/inventories/local
  interpreter_python=/usr/bin/python3
  vault_password_file = ~/.vault_pass
  log_path=${SETTINGS_SOURCE}/logs/ansible.log
EOF

  echo $(gettext "Création de la configuration en cours")
  # On crée la base de données
  sqlite3 "${SETTINGS_SOURCE}/ssddb" <<EOF
    create table seedbox_params(param varchar(50) PRIMARY KEY, value varchar(50));
    replace into seedbox_params (param,value) values ('installed',0);
    create table applications(name varchar(50) PRIMARY KEY,
      status integer,
      subdomain varchar(50),
      port integer);
    create table applications_params (appname varchar(50),
      param varchar(50),
      value varchar(50),
      FOREIGN KEY(appname) REFERENCES applications(name));
EOF

  ##################################################
  # Account.yml
  sudo mkdir "${SETTINGS_SOURCE}/logs" > /dev/null 2>&1
  sudo chown -R ${USER}: "${SETTINGS_SOURCE}/logs"
  sudo chmod 755 "${SETTINGS_SOURCE}/logs"

  create_dir "${SETTINGS_STORAGE}"
  create_dir "${SETTINGS_STORAGE}/variables"
  create_dir "${SETTINGS_STORAGE}/conf"
  create_dir "${SETTINGS_STORAGE}/vars"
  if [ ! -f "${ANSIBLE_VARS}" ]; then
    mkdir -p "${HOME}/.ansible/inventories/group_vars"
    cp ${SETTINGS_SOURCE}/includes/config/account.yml "${ANSIBLE_VARS}"
  fi

  if [[ -d "${HOME}/.cache" ]]; then
    sudo chown -R "${USER}": "${HOME}/.cache"
  fi
  if [[ -d "${HOME}/.local" ]]; then
    sudo chown -R "${USER}": "${HOME}/.local"
  fi
  if [[ -d "${HOME}/.ansible" ]]; then
    sudo chown -R "${USER}": "${HOME}/.ansible"
  fi

  touch "${SETTINGS_SOURCE}/.prerequis.lock"

  source "${SETTINGS_SOURCE}/venv/bin/activate"
  # on contre le bug de debian et du venv qui ne trouve pas les paquets installés par galaxy
  temppath=$(ls ${SETTINGS_SOURCE}/venv/lib)
  pythonpath=${SETTINGS_SOURCE}/venv/lib/${temppath}/site-packages

  export PYTHONPATH=${pythonpath}
  # toutes les installs communes
  # installation des dépendances, permet de créer les docker network via ansible
  ansible-galaxy collection install community.general
  #ansible-galaxy collection install community.docker
  # dépendence permettant de gérer les fichiers yml
  ansible-galaxy install kwoodson.yedit --force
  ansible-galaxy role install geerlingguy.docker --force

  manage_account_yml settings.storage "${SETTINGS_STORAGE}"
  manage_account_yml settings.source "${SETTINGS_SOURCE}"

  # On vérifie que le user ait bien les droits d'écriture
  make_dir_writable "${SETTINGS_SOURCE}"
  # on vérifie que le user ait bien les droits d'écriture dans la db
  change_file_owner "${SETTINGS_SOURCE}/ssddb"
  # On crée le conf dir (par défaut /opt/seedbox) s'il n'existe pas
  conf_dir

  stocke_public_ip

  # On crée les fichier de status à 0
  status
  # Mise à jour du système
  update_system
  # Installation des packages de base
  install_base_packages
  # Installation de docker
  install_docker
  install_environnement
  update_seedbox_param "installed" 1
  echo "Les composants sont maintenants tous installés/réglés, poursuite de l'installation"
  fi

# On finit de setter les variables
  source ${SETTINGS_SOURCE}/venv/bin/activate
  emplacement_stockage=$(get_from_account_yml settings.storage)
  if [ "${emplacement_stockage}" == notfound ]; then
    manage_account_yml settings.storage "${SETTINGS_STORAGE}"
  fi
# On ressource l'environnement
  source "${SETTINGS_SOURCE}/profile.sh"
  apply_patches

  echo "Installation SSDv2 terminée avec succès."

exit 0

