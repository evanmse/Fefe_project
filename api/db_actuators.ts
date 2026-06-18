import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * POST /api/db_actuators
 * Serverless function — contrôle des actionneurs (buzzer, LEDs)
 * 
 * Body: { action: 'buzzer'|'led', cmd?: string, groupe?: string, state?: 0|1 }
 */

const BUZZER_COMMANDS = [
  'BUZZER_PIT_STOP', 'BUZZER_SAFETY_CAR', 'BUZZER_RELEASE',
  'BUZZER_HOLD', 'BUZZER_EMERGENCY', 'BUZZER_TEST', 'BUZZER_OFF'
];

const DB_HOST = process.env.DB_HOST || 'mysql-pitwallg2.alwaysdata.net';
const DB_USER = process.env.DB_USER || 'pitwallg2';
const DB_PASSWORD = process.env.DB_PASSWORD || 'Isepeleve';
const DB_NAME = process.env.DB_NAME || 'pitwallg2_capteurs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const body = req.body ?? {};
  const { action, cmd, groupe, state } = body as {
    action: string;
    cmd?: string;
    groupe?: string;
    state?: number;
  };

  try {
    // Tenter MySQL direct
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

      if (action === 'buzzer' && cmd) {
        const cmdUpper = cmd.toUpperCase();
        if (!BUZZER_COMMANDS.includes(cmdUpper)) {
          await connection.end();
          return res.status(400).json({
            success: false,
            error: `Commande invalide. Acceptées : ${BUZZER_COMMANDS.join(', ')}`
          });
        }

        await connection.execute(
          "INSERT INTO commande_buzzer_g2e (commande, date_envoi) VALUES (?, NOW())",
          [cmdUpper]
        );
        await connection.end();

        return res.status(200).json({
          success: true,
          message: `Commande ${cmdUpper} envoyée au buzzer g2e`,
          commande: cmdUpper,
          source: 'mysql'
        });
      }

      if (action === 'led' && groupe && state !== undefined) {
        if (![0, 1].includes(state)) {
          await connection.end();
          return res.status(400).json({ success: false, error: "État doit être 0 ou 1" });
        }

        const [tables] = await connection.execute("SHOW TABLES LIKE '%led%'");
        const tableList = tables as Array<Record<string, string>>;
        
        if (tableList.length === 0) {
          await connection.end();
          return res.status(404).json({ success: false, error: "Aucune table LED trouvée" });
        }

        const tableName = Object.values(tableList[0])[0];
        await connection.execute(
          `INSERT INTO \`${tableName}\` (groupe, etat, date_modification) VALUES (?, ?, NOW())`,
          [groupe, state]
        );
        await connection.end();

        return res.status(200).json({
          success: true,
          message: `LED ${groupe} → ${state === 1 ? 'ON' : 'OFF'}`,
          groupe,
          etat: state,
          table: tableName,
          source: 'mysql'
        });
      }

      await connection.end();
    } catch (dbErr) {
      console.warn("[db_actuators] MySQL direct failed:", (dbErr as Error).message);
    }

    // Fallback : proxy PHP
    try {
      const phpBase = process.env.PHP_API_URL || 'http://localhost:3001';
      let phpUrl = '';

      if (action === 'buzzer' && cmd) {
        phpUrl = `${phpBase}/api/db_api.php?action=buzzer&cmd=${encodeURIComponent(cmd)}`;
      } else if (action === 'led' && groupe !== undefined && state !== undefined) {
        phpUrl = `${phpBase}/api/db_api.php?action=led&groupe=${encodeURIComponent(groupe)}&state=${state}`;
      }

      if (phpUrl) {
        const phpRes = await fetch(phpUrl);
        const phpData = await phpRes.json();
        return res.status(200).json({ ...phpData, source: 'php_proxy' });
      }
    } catch {
      // PHP non disponible
    }

    // Fallback simulé
    return res.status(200).json({
      success: true,
      message: `[SIMULÉ] ${action === 'buzzer' ? `Buzzer: ${cmd}` : `LED ${groupe}=${state}`}`,
      source: 'simulated',
      note: 'Mode démo. Installez mysql2 ou déployez le PHP pour les vrais actionneurs.'
    });

  } catch (err) {
    console.error("[db_actuators] Error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}
