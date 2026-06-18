#!/usr/bin/env python3
"""Pont Arduino -> MySQL pour LIDAR G2D. Usage: python3 scripts/lidar_ingest.py [--demo]"""
import time, re, argparse, math, random
try:
    import mysql.connector
except ImportError:
    print('pip install mysql-connector-python')
    exit(1)

DB = {'host':'mysql-pitwallg2.alwaysdata.net','user':'pitwallg2','password':'Isepeleve','database':'pitwallg2_capteurs','charset':'utf8mb4','connect_timeout':10}
ADC_PTS = [123, 854, 1007]
LUX_PTS = [6, 121, 2150]

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

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--port',help='port serie')
    p.add_argument('--baud',type=int,default=115200)
    p.add_argument('--interval',type=float,default=0.5)
    p.add_argument('--demo',action='store_true')
    a = p.parse_args()
    print('[DB] Connexion MySQL...')
    conn = mysql.connector.connect(**DB)
    cur = conn.cursor()
    print('[DB] OK. Calibration: ADC123->6lx ADC854->121lx ADC1007->2150lx')
    ser = None
    if not a.demo:
        try:
            import serial, serial.tools.list_ports
            ports = list(serial.tools.list_ports.comports())
            port = a.port or (ports[0].device if ports else None)
            if port:
                ser = serial.Serial(port, a.baud, timeout=2)
                time.sleep(2); ser.reset_input_buffer()
                print(f'[SER] {port} OK')
        except Exception as e:
            print(f'[!] Pas Arduino: {e} -> mode demo')
            a.demo = True
    pat = re.compile(r'LUX:\s*([\d.]+)\s*lx')
    cnt = 0; last = 0
    try:
        while True:
            t = time.time()
            if ser:
                line = ser.readline().decode('utf-8','ignore').strip()
                m = pat.search(line)
                if m:
                    lux = float(m.group(1))
                    adc = int((lux/2150)*1007)
                else:
                    continue
            else:
                # Demo: base sinusoïdale + spikes
                base = 500+300*(0.5+0.5*math.sin(t*0.3))
                spike = 1500 if random.random()<0.05 else 0
                lux = max(0,min(2500,base+spike+random.uniform(-80,80)))
                adc = int((lux/2150)*1007)
            if t - last >= a.interval:
                dist = 300-(lux/2150)*200+(hash(str(int(t*1000)))%50-25)
                angle = (adc/1023)*30-15
                ref = 50+(lux/2150)*30
                status = 'ERR' if lux<1 else ('WARN' if lux<10 else 'OK')
                cur.execute('INSERT INTO G2D_LIDAR (distance_mm,luminosite,adc_raw,angle_deg,reflectivite,status,date_mesure) VALUES (%s,%s,%s,%s,%s,%s,NOW())',
                    (round(dist,2),round(lux),adc,round(angle,2),round(ref,2),status))
                conn.commit()
                cnt+=1; last=t
                marker = '⚡' if lux>1500 else ('🌑' if lux<10 else '💡')
                print(f'[{cnt}] {marker} {lux:.1f} lux ADC={adc} dist={dist:.0f}mm -> BDD')
            time.sleep(max(0,a.interval-(time.time()-t)))
    except KeyboardInterrupt:
        print(f'\n[STOP] {cnt} mesures')
    finally:
        if ser: ser.close()
        cur.close(); conn.close()
main()
