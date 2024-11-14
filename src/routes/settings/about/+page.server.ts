import type { PageServerLoad } from './$types';
import fs from 'fs/promises';
import path from 'path';
import { dev } from '$app/environment';

export const load = (async () => {
  // Chemin vers version.txt dans le même répertoire que riven-frontend
  const versionFilePath = path.resolve('version.txt');
  
  let frontendVersion = 'Unknown';
  try {
    frontendVersion = (await fs.readFile(versionFilePath, 'utf-8')).trim();
  } catch (err) {
    console.error('Error reading frontend version file:', err);
  }

  return {
    frontendVersion
  };
}) satisfies PageServerLoad;
