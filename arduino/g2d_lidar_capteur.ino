/* ============================================================
   G2D · Capteur photosensible — Détection de franchissement de ligne
   ------------------------------------------------------------
   Cible      : STM32 (Nucleo/Blue Pill) ou Arduino Uno/Nano
   Capteur    : photorésistance (LDR) + pont diviseur sur A0
                pointée vers la piste. Asphalte = sombre,
                ligne peinte (départ/arrivée, vibreurs) = clair.
   Principe   : on lit la luminosité en continu. Quand le faisceau
                passe sur une ligne blanche, le lux grimpe au-dessus
                d'un seuil -> front montant = FRANCHISSEMENT.
                Hystérésis pour éviter les rebonds, chrono de tour.
   Sortie     : 1 trame CSV par mesure sur le port série (USB ou
                module Bluetooth HC-05/HC-06 câblé sur la même UART).
                Format :  G2D,<adc>,<lux>,<refl>,<ligne>,<tour>,<lap_ms>,<status>
                (compatible avec scripts/lidar_ingest.py)
   ============================================================ */

#define PIN_LUM A0

// ---- Calibration ADC -> lux (3 points mesurés) ----
const int   NB_POINTS = 3;
const float adcPoints[NB_POINTS] = {123, 854, 1007};
const float luxPoints[NB_POINTS] = {6, 121, 2150};
const float LUX_MAX = 2150.0f;          // pleine échelle pour la réflectivité

// ---- Détection de ligne (hystérésis sur la réflectivité %) ----
const float SEUIL_HAUT = 80.0f;         // entre sur la ligne quand refl > 80 %
const float SEUIL_BAS  = 60.0f;         // sort de la ligne quand refl < 60 %
const unsigned long ANTI_REBOND_MS = 300; // ignore une 2e ligne < 300 ms

// ---- Cadence d'envoi ----
const unsigned long PERIODE_MS = 100;   // 10 Hz (mets 500 pour 2 Hz)

bool          surLigne   = false;       // état hystérésis courant
unsigned long tour       = 0;           // compteur de tours
unsigned long lapMs      = 0;           // durée du dernier tour
unsigned long tDernLigne = 0;           // millis() du dernier franchissement
unsigned long tEnvoi     = 0;

float adcToLux(float adc) {
  if (adc <= adcPoints[0]) {
    float pente = (luxPoints[1] - luxPoints[0]) / (adcPoints[1] - adcPoints[0]);
    return max(luxPoints[0] + pente * (adc - adcPoints[0]), 0.0f);
  }
  if (adc >= adcPoints[NB_POINTS - 1]) {
    float pente = (luxPoints[NB_POINTS-1] - luxPoints[NB_POINTS-2]) /
                  (adcPoints[NB_POINTS-1] - adcPoints[NB_POINTS-2]);
    return luxPoints[NB_POINTS-1] + pente * (adc - adcPoints[NB_POINTS-1]);
  }
  for (int i = 0; i < NB_POINTS - 1; i++) {
    if (adc >= adcPoints[i] && adc <= adcPoints[i+1]) {
      float t = (adc - adcPoints[i]) / (adcPoints[i+1] - adcPoints[i]);
      return luxPoints[i] + t * (luxPoints[i+1] - luxPoints[i]);
    }
  }
  return 0;
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LUM, INPUT);
  // STM32 : décommente pour forcer une résolution ADC 10 bits (0..1023)
  // analogReadResolution(10);
}

void loop() {
  unsigned long now = millis();
  if (now - tEnvoi < PERIODE_MS) return;
  tEnvoi = now;

  int   adc  = analogRead(PIN_LUM);
  float lux  = adcToLux(adc);
  float refl = constrain((lux / LUX_MAX) * 100.0f, 0.0f, 100.0f);

  // --- Détection de franchissement avec hystérésis ---
  int franchissement = 0;
  if (!surLigne && refl > SEUIL_HAUT && (now - tDernLigne) > ANTI_REBOND_MS) {
    surLigne = true;
    franchissement = 1;
    if (tDernLigne > 0) lapMs = now - tDernLigne; // chrono du tour bouclé
    tDernLigne = now;
    tour++;
  } else if (surLigne && refl < SEUIL_BAS) {
    surLigne = false;                              // ré-armement pour la prochaine ligne
  }

  // --- Statut santé capteur ---
  const char* status = "OK";
  if (adc <= 2)          status = "ERR";   // capteur débranché / court-circuit
  else if (adc >= 1021)  status = "WARN";  // saturation lumineuse

  // --- Trame CSV ---
  Serial.print("G2D,");
  Serial.print(adc);            Serial.print(',');
  Serial.print(lux, 1);         Serial.print(',');
  Serial.print(refl, 1);        Serial.print(',');
  Serial.print(franchissement); Serial.print(',');
  Serial.print(tour);           Serial.print(',');
  Serial.print(lapMs);          Serial.print(',');
  Serial.println(status);
}
