// src/routes/settings/services.json/+server.ts
import fs from 'fs/promises';
import { json } from '@sveltejs/kit';

export async function GET() {
    const userName = process.env.USER || 'default_user';
    const filePath = `/home/${userName}/seedbox-compose/includes/config/services-available`;

    try {
        // Lire le fichier en texte brut
        const data = await fs.readFile(filePath, 'utf-8');
        
        // Diviser le contenu par ligne et extraire le premier mot comme label
        const items = data
            .split('\n')
            .map(line => line.trim().split(' ')[0])  // Récupérer le premier mot de chaque ligne
            .filter(word => word.length > 0)         // Filtrer les lignes vides
            .map((label, index) => ({ id: index, label }));  // Créer un objet avec id et label

        // Retourner les items sous forme de JSON
        return json({ items });
    } catch (error) {
        console.error('Erreur lors de la lecture du fichier:', error);
        return json({ error: 'Fichier non trouvé ou lecture impossible' }, { status: 500 });
    }
}
