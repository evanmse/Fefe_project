import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * GET/POST /api/db_sensors
 * Serverless function — proxy vers l'API PHP ou connexion directe MySQL
 * 
 * Pour Vercel : cette fonction fait office de proxy sécurisé vers la BDD.
 * En production, utilisez les variables d'environnement Vercel.
 * 
 * Query params:
 *   ?groupe=X   → Filtrer par groupe
 *   ?action=sensors|sensor_history
 */

const DB_HOST = process.env.DB_HOST || 'mysql-pitwallg2.alwaysdata.net';
const DB_USER = process.env.DB_USER || 'pitwallg2';
const DB_PASSWORD = process.env.DB_PASSWORD || 'Isepeleve';
const DB_NAME = process.env.DB_NAME || 'pitwallg2_capteurs';

// Utilisation de mysql2 pour Node.js (à installer : npm install mysql2)
// Pour l'instant, proxy vers PHP si disponible, sinon données simulées enrichies

interface SensorData {
  id: number;
  groupe: string;
  temperature: number | null;
  humidite: number | null;
  luminosite: number | null;
  date_mesure: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const groupe = (req.query.groupe as string) || null;
  const action = (req.query.action as string) || 'sensors';

  try {
    // Tenter de se connecter à la BDD MySQL via le driver mysql2
    let realData: SensorData[] | null = null;
    
    try {
      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        charset: 'utf8mb4',
        connectTimeout: 5000,
      });

      if (action === 'sensors') {
        if (groupe) {
          const [rows] = await connection.execute(
            "SELECT * FROM mesure WHERE groupe = ? ORDER BY date_mesure DESC LIMIT 50",
            [groupe]
          );
          realData = rows as SensorData[];
        } else {
          const [rows] = await connection.execute(
            `SELECT m.* FROM mesure m
             INNER JOIN (
               SELECT groupe, MAX(date_mesure) AS max_date
               FROM mesure GROUP BY groupe
             ) latest ON m.groupe = latest.groupe AND m.date_mesure = latest.max_date
             ORDER BY m.groupe`
          );
          realData = rows as SensorData[];
        }
      }

      await connection.end();
    } catch (dbErr) {
      console.warn("[db_sensors] MySQL direct failed, trying PHP proxy:", (dbErr as Error).message);
    }

    if (realData) {
      return res.status(200).json({ success: true, data: realData, count: realData.length, source: 'mysql' });
    }

    // Fallback : tenter le proxy PHP (pour environnement local avec PHP)
    try {
      const phpUrl = `${process.env.PHP_API_URL || 'http://localhost:3001'}/api/db_api.php?action=sensors${groupe ? '&groupe=' + groupe : ''}`;
      const phpRes = await fetch(phpUrl);
      if (phpRes.ok) {
        const phpData = await phpRes.json();
        return res.status(200).json({ ...phpData, source: 'php_proxy' });
      }
    } catch {
      // PHP proxy non disponible
    }

    // Fallback ultime : données enrichies (mode démo)
    const groupes = ['g2e', 'g2a', 'g2b', 'g2c', 'g2d'];
    const simulatedData: SensorData[] = groupes.map((g, i) => ({
      id: 1000 + i,
      groupe: g,
      temperature: 20 + Math.sin(Date.now() / 10000 + i) * 5 + (Math.random() - 0.5) * 2,
      humidite: 45 + Math.cos(Date.now() / 15000 + i) * 15 + (Math.random() - 0.5) * 3,
      luminosite: g === 'g2e' ? null : 400 + Math.sin(Date.now() / 8000 + i) * 200 + Math.random() * 50,
      date_mesure: new Date().toISOString(),
    }));

    return res.status(200).json({
      success: true,
      data: groupe ? simulatedData.filter(d => d.groupe === groupe) : simulatedData,
      count: groupe ? 1 : simulatedData.length,
      source: 'simulated',
      note: 'Mode démo — données simulées. Installez mysql2 pour la BDD réelle.'
    });

  } catch (err) {
    console.error("[db_sensors] Error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}
