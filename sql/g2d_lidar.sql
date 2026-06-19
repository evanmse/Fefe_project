-- ============================================================
--  G2D_LIDAR — Table capteur photosensible (franchissement de ligne)
--  BDD partagée : pitwallg2_capteurs (alwaysdata)
--  À exécuter une seule fois dans phpMyAdmin (onglet SQL) :
--    https://phpmyadmin.alwaysdata.com  ·  user pitwallg2
--  (le script scripts/lidar_ingest.py la crée aussi automatiquement)
-- ============================================================

CREATE TABLE IF NOT EXISTS G2D_LIDAR (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  distance_mm   DECIMAL(8,2)  NULL,           -- garde au sol optique estimée (mm)
  luminosite    INT           NOT NULL,       -- lux reçus par le capteur photosensible
  adc_raw       INT           NOT NULL,       -- valeur ADC brute (0..1023)
  angle_deg     DECIMAL(6,2)  DEFAULT 0,      -- angle faisceau (0 = capteur fixe)
  reflectivite  DECIMAL(5,2)  NULL,           -- réflectivité 0..100 % (ligne blanche = élevé)
  ligne         TINYINT(1)    DEFAULT 0,      -- 1 = franchissement de ligne détecté
  tour          INT           DEFAULT 0,      -- compteur de tours (incr. à chaque ligne départ/arrivée)
  lap_ms        INT           DEFAULT 0,      -- temps du dernier tour en ms
  status        VARCHAR(8)    DEFAULT 'OK',   -- OK · WARN · ERR
  date_mesure   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (date_mesure)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
