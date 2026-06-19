#!/usr/bin/env python3
"""Pont capteur G2D -> MySQL (franchissement de ligne, données réelles).

Lit les trames du sketch arduino/g2d_lidar_capteur.ino sur le port série
(USB OU module Bluetooth HC-05/06, qui apparaît aussi comme port série) et
insère chaque mesure dans la table G2D_LIDAR de la BDD partagée.

Usage :
  python3 scripts/lidar_ingest.py                 # auto-détecte le port série
  python3 scripts/lidar_ingest.py --port /dev/cu.usbserial-XXXX
  python3 scripts/lidar_ingest.py --port /dev/cu.HC-05      # Bluetooth (macOS)
  python3 scripts/lidar_ingest.py --port COM5               # Windows
  python3 scripts/lidar_ingest.py --demo          # sans matériel (données simulées)

Dépendances : pip install mysql-connector-python pyserial
"""
import time, re, argparse, math, random
try:
    import mysql.connector
except ImportError:
    print('pip install mysql-connector-python')
    exit(1)

DB = {'host':'mysql-pitwallg2.alwaysdata.net','user':'pitwallg2','password':'Isepeleve',
      'database':'pitwallg2_capteurs','charset':'utf8mb4','connect_timeout':10}

ADC_PTS = [123, 854, 1007]
LUX_PTS = [6, 121, 2150]
LUX_MAX = 2150.0

CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS G2D_LIDAR (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  distance_mm  DECIMAL(8,2)  NULL,
  luminosite   INT           NOT NULL,
  adc_raw      INT           NOT NULL,
  angle_deg    DECIMAL(6,2)  DEFAULT 0,
  reflectivite DECIMAL(5,2)  NULL,
  ligne        TINYINT(1)    DEFAULT 0,
  tour         INT           DEFAULT 0,
  lap_ms       INT           DEFAULT 0,
  status       VARCHAR(8)    DEFAULT 'OK',
  date_mesure  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (date_mesure)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""

# Colonnes ajoutées après coup : migration idempotente pour les tables déjà créées
MIGRATIONS = [
    "ALTER TABLE G2D_LIDAR ADD COLUMN ligne TINYINT(1) DEFAULT 0",
    "ALTER TABLE G2D_LIDAR ADD COLUMN tour INT DEFAULT 0",
    "ALTER TABLE G2D_LIDAR ADD COLUMN lap_ms INT DEFAULT 0",
]


def ensure_schema(cur, conn):
    cur.execute(CREATE_TABLE)
    cur.execute("SHOW COLUMNS FROM G2D_LIDAR")
    cols = {row[0] for row in cur.fetchall()}
    for col, ddl in zip(('ligne', 'tour', 'lap_ms'), MIGRATIONS):
        if col not in cols:
            cur.execute(ddl)
            print(f'[DB] colonne ajoutée : {col}')
    conn.commit()

# Trame riche du nouveau sketch : G2D,<adc>,<lux>,<refl>,<ligne>,<tour>,<lap_ms>,<status>
PAT_CSV = re.compile(r'^G2D,([\d.]+),([\d.]+),([\d.]+),([01]),(\d+),(\d+),(\w+)', re.I)
# Ancien sketch (rétro-compat) : "LUX: 123.4 lx"
PAT_LUX = re.compile(r'LUX:\s*([\d.]+)\s*lx')


def adc2lux(adc):
    if adc <= ADC_PTS[0]:
        s = (LUX_PTS[1]-LUX_PTS[0])/(ADC_PTS[1]-ADC_PTS[0])
        return max(0, LUX_PTS[0]+s*(adc-ADC_PTS[0]))
    if adc >= ADC_PTS[-1]:
        s = (LUX_PTS[-1]-LUX_PTS[-2])/(ADC_PTS[-1]-ADC_PTS[-2])
        return LUX_PTS[-1]+s*(adc-ADC_PTS[-1])
    for i in range(len(ADC_PTS)-1):
        if ADC_PTS[i] <= adc <= ADC_PTS[i+1]:
            t = (adc-ADC_PTS[i])/(ADC_PTS[i+1]-ADC_PTS[i])
            return LUX_PTS[i]+t*(LUX_PTS[i+1]-LUX_PTS[i])
    return 0


def parse(line):
    """Décode une trame série.

    Retourne un dict :
      {'rich': bool, 'adc', 'lux', 'refl', 'ligne', 'tour', 'lap_ms', 'status'}
    - rich=True  : nouveau firmware (G2D,...) -> ligne/tour/lap_ms déjà calculés
    - rich=False : ancien firmware (LUX: x lx) -> détection faite côté PC
    Retourne None si la ligne n'est pas reconnue.
    """
    m = PAT_CSV.match(line.strip())
    if m:
        return {'rich': True, 'adc': int(float(m.group(1))), 'lux': float(m.group(2)),
                'refl': float(m.group(3)), 'ligne': int(m.group(4)), 'tour': int(m.group(5)),
                'lap_ms': int(m.group(6)), 'status': m.group(7).upper()}
    m = PAT_LUX.search(line)
    if m:
        lux = float(m.group(1)); adc = int((lux/LUX_MAX)*1007)
        refl = max(0.0, min(100.0, lux/LUX_MAX*100))
        status = 'ERR' if adc <= 2 else ('WARN' if adc >= 1021 else 'OK')
        return {'rich': False, 'adc': adc, 'lux': lux, 'refl': refl,
                'ligne': 0, 'tour': 0, 'lap_ms': 0, 'status': status}
    return None


class LineDetector:
    """Détection de franchissement par seuil absolu de réflectivité (hystérésis).

    Utilisé quand le firmware n'embarque pas la logique (ancien sketch).

    Le capteur pointe la piste : asphalte / lumière ambiante = sombre (~3 %),
    ligne éclairée ou réfléchissante au passage = très claire (>90 %). On
    déclenche un franchissement sur le front montant quand la réflectivité
    dépasse `seuil_haut`, puis on ré-arme en repassant sous `seuil_bas`. Un
    anti-rebond évite les doublons. Ce seuil absolu sépare nettement le bruit
    ambiant d'un vrai passage et n'est pas piégé par les micro-variations de
    luminosité (qui faisaient déclencher l'ancienne détection par écart relatif).
    """
    def __init__(self, seuil_haut=50.0, seuil_bas=25.0, anti_rebond_s=0.8):
        self.seuil_haut = seuil_haut
        self.seuil_bas = seuil_bas
        self.anti_rebond = anti_rebond_s
        self.sur_ligne = False
        self.tour = 0
        self.t_dern = 0.0      # horodatage du dernier franchissement

    def update(self, refl, now):
        """Retourne (ligne, tour, lap_ms) pour la réflectivité courante (%)."""
        ligne = 0
        lap_ms = 0
        if not self.sur_ligne:
            if refl > self.seuil_haut and (now - self.t_dern) > self.anti_rebond:
                self.sur_ligne = True
                ligne = 1
                if self.t_dern > 0:
                    lap_ms = int((now - self.t_dern) * 1000)
                self.t_dern = now
                self.tour += 1
        elif refl < self.seuil_bas:
            self.sur_ligne = False            # ré-armement pour la prochaine ligne
        return ligne, self.tour, lap_ms


def open_serial(preferred_port, baud, wait=True):
    """Ouvre le port série (USB/Bluetooth). Retourne (ser, port) ou (None, None).

    Si wait=True, réessaie indéfiniment jusqu'à ce qu'un port soit disponible
    (utile pour une démo : on rebranche la carte et ça repart tout seul).
    """
    import serial, serial.tools.list_ports
    while True:
        ports = list(serial.tools.list_ports.comports())
        port = preferred_port or (ports[0].device if ports else None)
        if port:
            try:
                ser = serial.Serial(port, baud, timeout=2)
                time.sleep(2); ser.reset_input_buffer()
                return ser, port
            except Exception as e:
                print(f'[!] Port {port} inaccessible : {e}')
        if not wait:
            return None, None
        print('[…] En attente de la carte (rebranche l\'USB / réappaire le Bluetooth)…')
        time.sleep(2)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--port', help='port série (USB ou Bluetooth SPP)')
    p.add_argument('--baud', type=int, default=115200)
    p.add_argument('--interval', type=float, default=0.1, help='cadence mini entre 2 INSERT (s)')
    p.add_argument('--seuil-haut', type=float, default=50.0,
                   help='réflectivité %% au-dessus de laquelle on franchit la ligne')
    p.add_argument('--seuil-bas', type=float, default=25.0,
                   help='réflectivité %% sous laquelle on ré-arme la détection')
    p.add_argument('--anti-rebond', type=float, default=0.8,
                   help='délai mini (s) entre deux franchissements')
    p.add_argument('--demo', action='store_true',
                   help='génère des données SIMULÉES (aucun capteur requis)')
    a = p.parse_args()

    print('[DB] Connexion MySQL...')
    conn = mysql.connector.connect(**DB)
    cur = conn.cursor()
    ensure_schema(cur, conn)
    print('[DB] OK · table G2D_LIDAR prête.')

    ser = None
    if not a.demo:
        try:
            import serial  # noqa: F401
        except ImportError:
            print('[ERREUR] pyserial manquant -> pip install pyserial')
            cur.close(); conn.close(); return
        ser, port = open_serial(a.port, a.baud, wait=False)
        if not ser:
            print('[ERREUR] Aucun port série détecté. Branche la carte, ou lance --demo.')
            cur.close(); conn.close(); return
        print(f'[SER] {port} @ {a.baud} OK')
    else:
        print('[!] MODE DÉMO — données simulées (ne pas utiliser pour une vraie mesure).')

    detector = LineDetector(seuil_haut=a.seuil_haut, seuil_bas=a.seuil_bas,
                            anti_rebond_s=a.anti_rebond)
    cnt = 0; last = 0.0; t_demo = 0.0
    try:
        while True:
            now = time.time()
            if ser:
                try:
                    raw = ser.readline().decode('utf-8', 'ignore')
                except Exception as e:
                    # Carte débranchée / USB en veille : on reconnecte sans perdre les tours.
                    print(f'[!] Lecture série interrompue ({e}). Reconnexion…')
                    try:
                        ser.close()
                    except Exception:
                        pass
                    ser, port = open_serial(a.port, a.baud, wait=True)
                    print(f'[SER] {port} reconnecté @ {a.baud}.')
                    continue
                rec = parse(raw)
                if not rec:
                    continue
                adc, lux, refl, status = rec['adc'], rec['lux'], rec['refl'], rec['status']
                if rec['rich']:
                    ligne, tour, lap_ms = rec['ligne'], rec['tour'], rec['lap_ms']
                else:
                    ligne, tour, lap_ms = detector.update(refl, now)
            else:
                # Démo : asphalte sombre + spike net à chaque passage de ligne
                t_demo += a.interval
                base = 120 + 60*(0.5+0.5*math.sin(t_demo*0.4)) + random.uniform(-10, 10)
                spike = 1900 if (int(t_demo*10) % 90 == 0) else 0
                lux = max(0, min(LUX_MAX, (spike or base) + random.uniform(-15, 15)))
                adc = int((lux/LUX_MAX)*1007)
                refl = max(0.0, min(100.0, lux/LUX_MAX*100))
                status = 'OK' if adc > 2 else 'ERR'
                ligne, tour, lap_ms = detector.update(refl, now)

            if now - last < a.interval:
                continue

            # distance_mm = garde au sol optique estimée à partir du lux (proxy documenté)
            dist = round(300 - (lux/LUX_MAX)*200, 2)
            cur.execute(
                'INSERT INTO G2D_LIDAR (distance_mm,luminosite,adc_raw,angle_deg,reflectivite,'
                'ligne,tour,lap_ms,status,date_mesure) VALUES (%s,%s,%s,0,%s,%s,%s,%s,%s,NOW())',
                (dist, round(lux), adc, round(refl, 2), ligne, tour, lap_ms, status))
            conn.commit()
            cnt += 1; last = now
            if ligne:
                mark = '🏁'
            elif refl > detector.seuil_bas:
                mark = '💡'      # réflectivité élevée (proche/au-dessus du seuil)
            else:
                mark = '·'
            extra = f'  >>> FRANCHISSEMENT · TOUR {tour}' + (f' ({lap_ms} ms)' if lap_ms else '') if ligne else ''
            print(f'[{cnt}] {mark} {lux:6.1f} lux  ADC={adc:4d}  refl={refl:5.1f}%  {status}{extra}')
    except KeyboardInterrupt:
        print(f'\n[STOP] {cnt} mesures envoyées · {detector.tour} tours détectés.')
    finally:
        if ser:
            ser.close()
        cur.close(); conn.close()


main()
