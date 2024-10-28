import { type SuperValidated, type Infer } from 'sveltekit-superforms';
import { z } from 'zod';

// Application Settings Schema -----------------------------------------------------------------------------------

// Liste des paramètres à récupérer depuis l'API
export const applicationsSettingsToGet: string[] = [
    'authentification',
    'applications',
    'dossiers'
];

// Schéma de validation pour les paramètres d'application
export const applicationsSettingsSchema = z.object({
    id: z.union([z.number(), z.string()]).optional().default(0),
    label: z.string().optional().default(''),
    dossiers_on_item_type: z.array(z.object({
        label: z.string()
    })).optional().default([]),

    authentification: z
        .record(z.string(), z.union([
            z.literal("basique"),
            z.literal("oauth"),
            z.literal("authelia"),
            z.literal("aucune")
        ]))
        .optional()
        .default({ traefik: "basique" }), // Ajout de traefik avec valeur par défaut

    // Domaine est un dictionnaire avec des chaînes comme valeurs
    domaine: z.record(z.string(), z.string().nullable()).optional().default({}),
    
    // Champs supplémentaires pour Plex
    plex_token: z.string().optional().default(''),
    plex_login: z.string().optional().default(''),
    plex_password: z.string().optional().default('')
});

export function applicationsSettingsToPass(data: any) {
    console.log('Données d\'authentification avant traitement:', data?.data?.dossiers?.authentification);

    let applications = data?.data?.applications || [];
    if (!Array.isArray(applications)) applications = applications ? [applications] : [];

    if (applications.length === 0) {
        return {
            id: 0,
            label: '',
            domaine: {},
            dossiers_on_item_type: [],
            authentification: { traefik: "basique" },
            plex_token: '',
            plex_login: '',
            plex_password: ''
        };
    }

    const selectedApplication = applications[0];
    const dossiers_on_item_type = (data?.data?.dossiers?.on_item_type || []).map((item: string) => ({
        label: item
    }));

    const authentification = dossiers_on_item_type.reduce((acc, item) => {
        const authValue = data?.data?.dossiers?.authentification?.[item.label];
        acc[item.label] = authValue !== undefined && authValue !== null ? authValue : 'basique';
        return acc;
    }, { traefik: 'basique' } as Record<string, string>);

    const domaine = dossiers_on_item_type.reduce((acc, item) => {
        acc[item.label] = data?.data?.dossiers?.domaine?.[item.label] || '';
        return acc;
    }, {} as Record<string, string>);

    return {
        id: selectedApplication.id || 0,
        label: selectedApplication.label || '',
        domaine,
        dossiers_on_item_type,
        authentification
    };
}

// Fonction pour mettre à jour les paramètres
export function applicationsSettingsToSet(
    form: SuperValidated<ApplicationsSettingsSchema>, existingData = []
) {
    console.log('Données du formulaire avant mise à jour:', form.data);

    const newApplication = {
        id: form.data.id?.toString(),
        label: form.data.label
    };

    const dossiers = {
        on_item_type: form.data.dossiers_on_item_type.map((item) => item.label),
        authentification: form.data.authentification,
        domaine: form.data.domaine
    };

    const result = [
        {
            key: 'applications',
            value: [...existingData, newApplication]
        },
        {
            key: 'dossiers',
            value: dossiers
        }
    ];

    console.log('Données à retourner après mise à jour:', result);
    return result;
}

// seedbox Settings -----------------------------------------------------------------------------------
// Les clés que nous allons récupérer depuis l'API
export const seedboxSettingsToGet: string[] = ['cloudflare', 'utilisateur'];

export const seedboxSettingsSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address"),
  domain: z.string().regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid domain format"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  cloudflare_login: z.string().min(1, "Login is required"),
  cloudflare_api_key: z.string().min(1, "API key is required"),
  traefik: z
    .object({
      authMethod: z.enum(['basique', 'oauth', 'authelia', 'aucune']),
      oauth_client: z.string().default(''),
      oauth_secret: z.string().default(''),
      oauth_mail: z.string().default(''),
    })
    .default({
      authMethod: 'basique',
      oauth_client: '',
      oauth_secret: '',
      oauth_mail: '',
    }),
  domainperso: z.string().optional().default("traefik"),
});

export type SeedboxSettingsSchema = typeof seedboxSettingsSchema;

// Ajustement de la fonction seedboxSettingsToPass pour éviter les erreurs d’accès aux données
export function seedboxSettingsToPass(data: any) {
  if (!data?.utilisateur || !data?.cloudflare) {
    console.error("Données utilisateur ou cloudflare manquantes :", data);
    return {};
  }

  const traefik = data.utilisateur.traefik || {};

  return {
    username: data.utilisateur.username || '',
    email: data.utilisateur.email || '',
    domain: data.utilisateur.domain || '',
    password: data.utilisateur.password || '',
    domainperso: data.utilisateur.domainperso || 'traefik',
    cloudflare_login: data.cloudflare.cloudflare_login || '',
    cloudflare_api_key: data.cloudflare.cloudflare_api_key || '',
    traefik: {
      authMethod: "basique", // Toujours "basique" par défaut
      oauth_client: traefik.oauth_client || '',
      oauth_secret: traefik.oauth_secret || '',
      oauth_mail: traefik.oauth_mail || '',
    },
  };
}

// Fonction pour préparer les données du formulaire en vue de leur enregistrement
export function seedboxSettingsToSet(form: SuperValidated<Infer<SeedboxSettingsSchema>>) {
  const authMethod = form.data.traefik?.authMethod;

  const traefikData = {
    authMethod: authMethod,
    ...(authMethod === 'oauth' && {
      oauth_client: form.data.traefik.oauth_client,
      oauth_secret: form.data.traefik.oauth_secret,
      oauth_mail: form.data.traefik.oauth_mail,
    }),
  };

  return [
    {
      key: 'utilisateur',
      value: {
        username: form.data.username,
        domain: form.data.domain,
        email: form.data.email,
        password: form.data.password,
        traefik: traefikData,
        domainperso: form.data.domainperso,
      },
    },
    {
      key: 'cloudflare',
      value: {
        cloudflare_login: form.data.cloudflare_login,
        cloudflare_api_key: form.data.cloudflare_api_key,
      },
    },
  ];
}

// General Settings -----------------------------------------------------------------------------------
export const generalSettingsToGet: string[] = [
	'debug',
	'log',
	'symlink',
	'downloaders',
	'database',
	'indexer',
	'notifications',
	'post_processing'
];

export const generalSettingsSchema = z.object({
	debug: z.boolean().default(true),
	log: z.boolean().default(true),
	rclone_path: z.string().min(1),
	library_path: z.string().min(1),
	separate_anime_dirs: z.boolean().default(false),
	repair_symlinks: z.boolean().default(false),
	repair_interval: z.coerce.number().gte(0).int().optional().default(6),
	realdebrid_enabled: z.boolean().default(false),
	realdebrid_api_key: z.string().optional().default(''),
	realdebrid_proxy_enabled: z.boolean().default(false),
	realdebrid_proxy_url: z.string().optional().default(''),
	torbox_enabled: z.boolean().default(false),
	torbox_api_key: z.string().optional().default(''),
	alldebrid_enabled: z.boolean().default(false),
	alldebrid_api_key: z.string().optional().default(''),
	alldebrid_proxy_enabled: z.boolean().default(false),
	alldebrid_proxy_url: z.string().optional().default(''),
	database_host: z
		.string()
		.optional()
		.default('postgresql+psycopg2://postgres:postgres@riven-db:5432/riven'),
	notifications_enabled: z.boolean().default(false),
	notifications_title: z.string().optional().default('Riven completed something'),
	notifications_on_item_type: z.string().array().optional().default([]),
	notifications_service_urls: z.string().array().optional().default([]),
	subliminal_enabled: z.boolean().default(false),
	subliminal_languages: z.string().array().optional().default([]),
	subliminal_providers_opensubtitles_enabled: z.boolean().optional().default(false),
	subliminal_providers_opensubtitles_username: z.string().optional().default(''),
	subliminal_providers_opensubtitles_password: z.string().optional().default(''),
	subliminal_providers_opensubtitlescom_enabled: z.boolean().optional().default(false),
	subliminal_providers_opensubtitlescom_username: z.string().optional().default(''),
	subliminal_providers_opensubtitlescom_password: z.string().optional().default(''),
	indexer_update_interval: z.coerce.number().gte(0).int().optional().default(3600)
});
export type GeneralSettingsSchema = typeof generalSettingsSchema;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generalSettingsToPass(data: any) {
	return {
		debug: data.debug,
		log: data.log,
		rclone_path: data.symlink.rclone_path,
		library_path: data.symlink.library_path,
		separate_anime_dirs: data.symlink.separate_anime_dirs,
		repair_symlinks: data.symlink.repair_symlinks,
		repair_interval: data.symlink.repair_interval,
		realdebrid_enabled: data.downloaders.real_debrid.enabled,
		realdebrid_api_key: data.downloaders.real_debrid?.api_key,
		realdebrid_proxy_enabled: data.downloaders.real_debrid?.proxy_enabled,
		realdebrid_proxy_url: data.downloaders.real_debrid?.proxy_url,
		torbox_enabled: data.downloaders.torbox.enabled,
		torbox_api_key: data.downloaders.torbox?.api_key,
		alldebrid_enabled: data.downloaders.all_debrid.enabled,
		alldebrid_api_key: data.downloaders.all_debrid?.api_key,
		alldebrid_proxy_enabled: data.downloaders.all_debrid?.proxy_enabled,
		alldebrid_proxy_url: data.downloaders.all_debrid?.proxy_url,
		database_host: data.database.host,
		notifications_enabled: data.notifications.enabled,
		notifications_title: data.notifications.title,
		notifications_on_item_type: data.notifications.on_item_type,
		notifications_service_urls: data.notifications.service_urls,
		subliminal_enabled: data.post_processing.subliminal.enabled,
		subliminal_languages: data.post_processing.subliminal?.languages,
		subliminal_providers_opensubtitles_enabled:
			data.post_processing.subliminal?.providers.opensubtitles.enabled,
		subliminal_providers_opensubtitles_username:
			data.post_processing.subliminal?.providers.opensubtitles.username,
		subliminal_providers_opensubtitles_password:
			data.post_processing.subliminal?.providers.opensubtitles.password,
		subliminal_providers_opensubtitlescom_enabled:
			data.post_processing.subliminal?.providers.opensubtitlescom.enabled,
		subliminal_providers_opensubtitlescom_username:
			data.post_processing.subliminal?.providers.opensubtitlescom.username,
		subliminal_providers_opensubtitlescom_password:
			data.post_processing.subliminal?.providers.opensubtitlescom.password,
		indexer_update_interval: data.indexer.update_interval
	};
}

export function generalSettingsToSet(form: SuperValidated<Infer<GeneralSettingsSchema>>) {
	return [
		{
			key: 'debug',
			value: form.data.debug
		},
		{
			key: 'log',
			value: form.data.log
		},
		{
			key: 'symlink',
			value: {
				rclone_path: form.data.rclone_path,
				library_path: form.data.library_path,
				separate_anime_dirs: form.data.separate_anime_dirs,
				repair_symlinks: form.data.repair_symlinks,
				repair_interval: form.data.repair_interval
			}
		},
		{
			key: 'downloaders',
			value: {
				real_debrid: {
					enabled: form.data.realdebrid_enabled,
					api_key: form.data.realdebrid_api_key,
					proxy_enabled: form.data.realdebrid_proxy_enabled,
					proxy_url: form.data.realdebrid_proxy_url
				},
				all_debrid: {
					enabled: form.data.alldebrid_enabled,
					api_key: form.data.alldebrid_api_key,
					proxy_enabled: form.data.alldebrid_proxy_enabled,
					proxy_url: form.data.alldebrid_proxy_url
				},
				torbox: {
					enabled: form.data.torbox_enabled,
					api_key: form.data.torbox_api_key
				}
			}
		},
		{
			key: 'database',
			value: {
				host: form.data.database_host
			}
		},
		{
			key: 'indexer',
			value: {
				update_interval: form.data.indexer_update_interval
			}
		},
		{
			key: 'notifications',
			value: {
				enabled: form.data.notifications_enabled,
				title: form.data.notifications_title,
				on_item_type: form.data.notifications_on_item_type,
				service_urls: form.data.notifications_service_urls
			}
		},
		{
			key: 'post_processing',
			value: {
				subliminal: {
					enabled: form.data.subliminal_enabled,
					languages: form.data.subliminal_languages,
					providers: {
						opensubtitles: {
							enabled: form.data.subliminal_providers_opensubtitles_enabled,
							username: form.data.subliminal_providers_opensubtitles_username,
							password: form.data.subliminal_providers_opensubtitles_password
						},
						opensubtitlescom: {
							enabled: form.data.subliminal_providers_opensubtitlescom_enabled,
							username: form.data.subliminal_providers_opensubtitlescom_username,
							password: form.data.subliminal_providers_opensubtitlescom_password
						}
					}
				}
			}
		}
	];
}

// Media Server Settings -----------------------------------------------------------------------------------

export const mediaServerSettingsToGet: string[] = ['updaters'];

export const mediaServerSettingsSchema = z.object({
	// update_interval: z.number().nonnegative().int().optional().default(120), // Moved to coerce due to https://github.com/huntabyte/shadcn-svelte/issues/574
	update_interval: z.coerce.number().gte(0).int().optional().default(120),
	plex_enabled: z.boolean().default(false),
	plex_token: z.string().optional().default(''),
	plex_login: z.string().optional().default(''),
	plex_password: z.string().optional().default(''),
	plex_url: z.string().optional().default('')
});
export type MediaServerSettingsSchema = typeof mediaServerSettingsSchema;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mediaServerSettingsToPass(data: any) {
	return {
		update_interval: data.updaters.update_interval,
		plex_token: data.updaters.plex.token,
		plex_url: data.updaters.plex.url,
		plex_login: data.updaters.plex.login,
		plex_password: data.updaters.plex.password,
		plex_enabled: data.updaters.plex.enabled
	};
}

export function mediaServerSettingsToSet(form: SuperValidated<Infer<MediaServerSettingsSchema>>) {
	return [
		{
			key: 'updaters',
			value: {
				update_interval: form.data.update_interval,
				plex: {
					enabled: form.data.plex_enabled,
					token: form.data.plex_token,
					login: form.data.plex_login,
					password: form.data.plex_password,
					url: form.data.plex_url
				}
			}
		}
	];
}

// Scrapers Settings -----------------------------------------------------------------------------------

export const scrapersSettingsToGet: string[] = ['scraping'];

export const scrapersSettingsSchema = z.object({
	after_2: z.coerce.number().gte(0).int().default(0.5),
	after_5: z.coerce.number().gte(0).int().default(2),
	after_10: z.coerce.number().gte(0).int().default(24),
	torrentio_enabled: z.boolean().default(false),
	torrentio_url: z.string().optional().default('https://torrentio.strem.fun'),
	torrentio_timeout: z.coerce.number().gte(0).int().optional().default(30),
	torrentio_ratelimit: z.boolean().default(true),
	torrentio_filter: z
		.string()
		.optional()
		.default('sort=qualitysize%7Cqualityfilter=480p,scr,cam,unknown'),
	knightcrawler_enabled: z.boolean().default(false),
	knightcrawler_url: z.string().optional().default('https://knightcrawler.elfhosted.com/'),
	knightcrawler_timeout: z.coerce.number().gte(0).int().optional().default(30),
	knightcrawler_ratelimit: z.boolean().default(true),
	knightcrawler_filter: z
		.string()
		.optional()
		.default('sort=qualitysize%7Cqualityfilter=480p,scr,cam,unknown'),
	annatar_enabled: z.boolean().default(false),
	annatar_url: z.string().optional().default('https://annatar.elfhosted.com'),
	annatar_timeout: z.coerce.number().gte(0).int().optional().default(10),
	annatar_ratelimit: z.boolean().default(true),
	annatar_limit: z.coerce.number().gte(0).int().optional().default(2000),
	orionoid_enabled: z.boolean().default(false),
	orionoid_api_key: z.string().optional().default(''),
	orionoid_timeout: z.coerce.number().gte(0).int().optional().default(10),
	orionoid_ratelimit: z.boolean().default(true),
	orionoid_limitcount: z.coerce.number().gte(0).int().optional().default(5),
	jackett_enabled: z.boolean().default(false),
	jackett_url: z.string().optional().default('http://localhost:9117'),
	jackett_timeout: z.coerce.number().gte(0).int().optional().default(10),
	jackett_ratelimit: z.boolean().default(true),
	jackett_api_key: z.string().optional().default(''),
	mediafusion_enabled: z.boolean().default(false),
	mediafusion_url: z.string().optional().default('https://mediafusion.elfhosted.com'),
	mediafusion_timeout: z.coerce.number().gte(0).int().optional().default(10),
	mediafusion_ratelimit: z.boolean().default(true),
	mediafusion_catalogs: z.array(z.string()).optional().default([]),
	prowlarr_enabled: z.boolean().default(false),
	prowlarr_url: z.string().optional().default('http://localhost:9696'),
	prowlarr_timeout: z.coerce.number().gte(0).int().optional().default(10),
	prowlarr_ratelimit: z.boolean().default(true),
	prowlarr_limiter_seconds: z.coerce.number().gte(0).int().optional().default(60),
	prowlarr_api_key: z.string().optional().default(''),
	torbox_scraper_enabled: z.boolean().default(false),
	torbox_scraper_timeout: z.coerce.number().gte(0).int().optional().default(30),
	torbox_scraper_ratelimit: z.boolean().default(true),
	zilean_enabled: z.boolean().default(false),
	zilean_url: z.string().optional().default('http://localhost:8181'),
	zilean_timeout: z.coerce.number().gte(0).int().optional().default(30),
	zilean_ratelimit: z.boolean().default(true),
	comet_enabled: z.boolean().default(false),
	comet_url: z.string().optional().default('http://localhost:8000'),
	comet_indexers: z.array(z.string()).optional().default([]),
	comet_timeout: z.coerce.number().gte(0).int().optional().default(30),
	comet_ratelimit: z.boolean().default(true)
});
export type ScrapersSettingsSchema = typeof scrapersSettingsSchema;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function scrapersSettingsToPass(data: any) {
	return {
		after_2: data.scraping.after_2,
		after_5: data.scraping.after_5,
		after_10: data.scraping.after_10,
		torrentio_url: data.scraping.torrentio?.url,
		torrentio_enabled: data.scraping.torrentio.enabled,
		torrentio_filter: data.scraping.torrentio?.filter,
		torrentio_timeout: data.scraping.torrentio?.timeout,
		torrentio_ratelimit: data.scraping.torrentio?.ratelimit,
		knightcrawler_url: data.scraping.knightcrawler?.url,
		knightcrawler_enabled: data.scraping.knightcrawler.enabled,
		knightcrawler_filter: data.scraping.knightcrawler?.filter,
		knightcrawler_timeout: data.scraping.knightcrawler?.timeout,
		knightcrawler_ratelimit: data.scraping.knightcrawler?.ratelimit,
		annatar_url: data.scraping.annatar?.url,
		annatar_enabled: data.scraping.annatar.enabled,
		annatar_limit: data.scraping.annatar?.limit,
		annatar_timeout: data.scraping.annatar?.timeout,
		annatar_ratelimit: data.scraping.annatar?.ratelimit,
		orionoid_enabled: data.scraping.orionoid.enabled,
		orionoid_api_key: data.scraping.orionoid?.api_key,
		orionoid_limitcount: data.scraping.orionoid?.limitcount,
		orionoid_timeout: data.scraping.orionoid?.timeout,
		orionoid_ratelimit: data.scraping.orionoid?.ratelimit,
		jackett_enabled: data.scraping.jackett.enabled,
		jackett_url: data.scraping.jackett?.url,
		jackett_api_key: data.scraping.jackett?.api_key,
		jackett_timeout: data.scraping.jackett?.timeout,
		jackett_ratelimit: data.scraping.jackett?.ratelimit,
		mediafusion_url: data.scraping.mediafusion?.url,
		mediafusion_enabled: data.scraping.mediafusion.enabled,
		mediafusion_catalogs: data.scraping.mediafusion.catalogs,
		mediafusion_timeout: data.scraping.mediafusion?.timeout,
		mediafusion_ratelimit: data.scraping.mediafusion?.ratelimit,
		prowlarr_enabled: data.scraping.prowlarr?.enabled,
		prowlarr_url: data.scraping.prowlarr?.url,
		prowlarr_api_key: data.scraping.prowlarr?.api_key,
		prowlarr_timeout: data.scraping.prowlarr?.timeout,
		prowlarr_ratelimit: data.scraping.prowlarr?.ratelimit,
		prowlarr_limiter_seconds: data.scraping.prowlarr?.limiter_seconds,
		torbox_scraper_enabled: data.scraping.torbox_scraper?.enabled,
		torbox_scraper_timeout: data.scraping.torbox_scraper?.timeout,
		torbox_scraper_ratelimit: data.scraping.torbox_scraper?.ratelimit,
		zilean_enabled: data.scraping.zilean?.enabled,
		zilean_url: data.scraping.zilean?.url,
		zilean_timeout: data.scraping.zilean?.timeout,
		zilean_ratelimit: data.scraping.zilean?.ratelimit,
		comet_enabled: data.scraping.comet?.enabled,
		comet_url: data.scraping.comet?.url,
		comet_indexers: data.scraping.comet?.indexers,
		comet_timeout: data.scraping.comet?.timeout,
		comet_ratelimit: data.scraping.comet?.ratelimit
	};
}

export function scrapersSettingsToSet(form: SuperValidated<Infer<ScrapersSettingsSchema>>) {
	return [
		{
			key: 'scraping',
			value: {
				after_2: form.data.after_2,
				after_5: form.data.after_5,
				after_10: form.data.after_10,
				torrentio: {
					enabled: form.data.torrentio_enabled,
					url: form.data.torrentio_url,
					filter: form.data.torrentio_filter,
					timeout: form.data.torrentio_timeout,
					ratelimit: form.data.torrentio_ratelimit
				},
				knightcrawler: {
					enabled: form.data.knightcrawler_enabled,
					url: form.data.knightcrawler_url,
					filter: form.data.knightcrawler_filter,
					timeout: form.data.knightcrawler_timeout,
					ratelimit: form.data.knightcrawler_ratelimit
				},
				annatar: {
					enabled: form.data.annatar_enabled,
					url: form.data.annatar_url,
					limit: form.data.annatar_limit,
					timeout: form.data.annatar_timeout,
					ratelimit: form.data.annatar_ratelimit
				},
				orionoid: {
					enabled: form.data.orionoid_enabled,
					api_key: form.data.orionoid_api_key,
					limitcount: form.data.orionoid_limitcount,
					timeout: form.data.orionoid_timeout,
					ratelimit: form.data.orionoid_ratelimit
				},
				jackett: {
					enabled: form.data.jackett_enabled,
					url: form.data.jackett_url,
					api_key: form.data.jackett_api_key,
					timeout: form.data.jackett_timeout,
					ratelimit: form.data.jackett_ratelimit
				},
				mediafusion: {
					enabled: form.data.mediafusion_enabled,
					url: form.data.mediafusion_url,
					catalogs: form.data.mediafusion_catalogs,
					timeout: form.data.mediafusion_timeout,
					ratelimit: form.data.mediafusion_ratelimit
				},
				prowlarr: {
					enabled: form.data.prowlarr_enabled,
					url: form.data.prowlarr_url,
					api_key: form.data.prowlarr_api_key,
					timeout: form.data.prowlarr_timeout,
					ratelimit: form.data.prowlarr_ratelimit,
					limiter_seconds: form.data.prowlarr_limiter_seconds
				},
				torbox_scraper: {
					enabled: form.data.torbox_scraper_enabled,
					timeout: form.data.torbox_scraper_timeout,
					ratelimit: form.data.torbox_scraper_ratelimit
				},
				zilean: {
					enabled: form.data.zilean_enabled,
					url: form.data.zilean_url,
					timeout: form.data.zilean_timeout,
					ratelimit: form.data.zilean_ratelimit
				},
				comet: {
					enabled: form.data.comet_enabled,
					url: form.data.comet_url,
					indexers: form.data.comet_indexers,
					timeout: form.data.comet_timeout,
					ratelimit: form.data.comet_ratelimit
				}
			}
		}
	];
}

// Content Settings -----------------------------------------------------------------------------------

export const contentSettingsToGet: string[] = ['content'];

export const contentSettingsSchema = z.object({
	overseerr_enabled: z.boolean().default(false),
	overseerr_url: z.string().optional().default(''),
	overseerr_api_key: z.string().optional().default(''),
	overseerr_update_interval: z.coerce.number().gte(0).int().optional().default(30),
	overseerr_use_webhook: z.boolean().optional().default(false),
	mdblist_enabled: z.boolean().default(false),
	mdblist_api_key: z.string().optional().default(''),
	mdblist_update_interval: z.coerce.number().gte(0).int().optional().default(300),
	mdblist_lists: z.string().array().optional().default([]),
	plex_watchlist_enabled: z.boolean().default(false),
	plex_watchlist_rss: z.array(z.string()).optional().default([]),
	plex_watchlist_update_interval: z.coerce.number().gte(0).int().optional().default(60),
	listrr_enabled: z.boolean().default(false),
	listrr_api_key: z.string().optional().default(''),
	listrr_update_interval: z.coerce.number().gte(0).int().optional().default(300),
	listrr_movie_lists: z.string().array().optional().default([]),
	listrr_show_lists: z.string().array().optional().default([]),
	trakt_enabled: z.boolean().default(false),
	trakt_api_key: z.string().optional().default(''),
	trakt_update_interval: z.coerce.number().gte(0).int().optional().default(300),
	trakt_watchlist: z.array(z.string()).optional().default([]),
	trakt_user_lists: z.array(z.string()).optional().default([]),
	trakt_collection: z.array(z.string()).optional().default([]),
	trakt_fetch_trending: z.boolean().default(false),
	trakt_fetch_popular: z.boolean().default(false),
	trakt_trending_count: z.coerce.number().gte(0).int().optional().default(10),
	trakt_popular_count: z.coerce.number().gte(0).int().optional().default(10)
});
export type ContentSettingsSchema = typeof contentSettingsSchema;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function contentSettingsToPass(data: any) {
	return {
		overseerr_enabled: data.content.overseerr.enabled,
		overseerr_url: data.content.overseerr?.url,
		overseerr_api_key: data.content.overseerr?.api_key,
		overseerr_update_interval: data.content.overseerr?.update_interval,
		overseerr_use_webhook: data.content.overseerr?.use_webhook,
		mdblist_enabled: data.content.mdblist.enabled,
		mdblist_api_key: data.content.mdblist?.api_key,
		mdblist_update_interval: data.content.mdblist?.update_interval,
		mdblist_lists: data.content.mdblist?.lists,
		plex_watchlist_enabled: data.content.plex_watchlist.enabled,
		plex_watchlist_rss: data.content.plex_watchlist?.rss,
		plex_watchlist_update_interval: data.content.plex_watchlist?.update_interval,
		listrr_enabled: data.content.listrr.enabled,
		listrr_api_key: data.content.listrr?.api_key,
		listrr_update_interval: data.content.listrr?.update_interval,
		listrr_movie_lists: data.content.listrr?.movie_lists,
		listrr_show_lists: data.content.listrr?.show_lists,
		trakt_enabled: data.content.trakt.enabled,
		trakt_api_key: data.content.trakt?.api_key,
		trakt_update_interval: data.content.trakt?.update_interval,
		trakt_watchlist: data.content.trakt?.watchlist,
		trakt_user_lists: data.content.trakt?.user_lists,
		trakt_collection: data.content.trakt?.collection,
		trakt_fetch_trending: data.content.trakt?.fetch_trending,
		trakt_fetch_popular: data.content.trakt?.fetch_popular,
		trakt_trending_count: data.content.trakt?.trending_count,
		trakt_popular_count: data.content.trakt?.popular_count
	};
}

export function contentSettingsToSet(form: SuperValidated<Infer<ContentSettingsSchema>>) {
	return [
		{
			key: 'content',
			value: {
				overseerr: {
					enabled: form.data.overseerr_enabled,
					url: form.data.overseerr_url,
					api_key: form.data.overseerr_api_key,
					update_interval: form.data.overseerr_update_interval,
					use_webhook: form.data.overseerr_use_webhook
				},
				mdblist: {
					enabled: form.data.mdblist_enabled,
					api_key: form.data.mdblist_api_key,
					update_interval: form.data.mdblist_update_interval,
					lists: form.data.mdblist_lists
				},
				plex_watchlist: {
					enabled: form.data.plex_watchlist_enabled,
					rss: form.data.plex_watchlist_rss,
					update_interval: form.data.plex_watchlist_update_interval
				},
				listrr: {
					enabled: form.data.listrr_enabled,
					api_key: form.data.listrr_api_key,
					update_interval: form.data.listrr_update_interval,
					movie_lists: form.data.listrr_movie_lists,
					show_lists: form.data.listrr_show_lists
				},
				trakt: {
					enabled: form.data.trakt_enabled,
					api_key: form.data.trakt_api_key,
					update_interval: form.data.trakt_update_interval,
					watchlist: form.data.trakt_watchlist,
					user_lists: form.data.trakt_user_lists,
					collection: form.data.trakt_collection,
					fetch_trending: form.data.trakt_fetch_trending,
					fetch_popular: form.data.trakt_fetch_popular,
					trending_count: form.data.trakt_trending_count,
					popular_count: form.data.trakt_popular_count
				}
			}
		}
	];
}
