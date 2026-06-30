import machine
import network
import urequests
import time
import micropython
import json

# ==============================================================================
# 1. SECURITY LOCKDOWN
# ==============================================================================
# We use GPIO Pin 15 for Developer Mode override.
# Connect a jumper wire between GP15 and GND *before* powering on the Pico to enable REPL.
dev_pin = machine.Pin(15, machine.Pin.IN, machine.Pin.PULL_UP)

if dev_pin.value() == 1:
    # Pin is HIGH (no jumper attached). Disable Ctrl+C interrupt.
    # This prevents attackers from stopping the script and accessing the filesystem via REPL.
    print("[SECURITY] Normal Mode: REPL locked. Attach GP15 to GND to unlock.")
    micropython.kbd_intr(-1)
else:
    # Pin is LOW (jumper is attached to GND). Allow Ctrl+C.
    print("[SECURITY] Developer Mode: REPL unlocked.")

# ==============================================================================
# 2. LOAD SECRETS & CONNECT WIFI
# ==============================================================================
try:
    import secrets
except ImportError:
    print("[ERROR] secrets.py not found. Please upload it via Thonny.")
    while True:
        time.sleep(1)

wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.connect(secrets.WIFI_SSID, secrets.WIFI_PASSWORD)

print(f"Connecting to {secrets.WIFI_SSID}...")
while not wlan.isconnected() and wlan.status() >= 0:
    time.sleep(1)
    
print("Connected! IP:", wlan.ifconfig()[0])

# ==============================================================================
# 3. SECURE PING LOGIC (HTTPS)
# ==============================================================================
def sync_with_backend():
    url = f"{secrets.API_BASE}/api/devices/ping"
    headers = {
        "Authorization": f"Bearer {secrets.DEVICE_KEY}",
        "Content-Type": "application/json"
    }
    
    # We send dummy data for the ping. In a real punch flow, you'd read the RFID scanner here.
    payload = json.dumps({"status": "online", "hardwareId": machine.unique_id().hex()})
    
    try:
        # MicroPython urequests handles HTTPS automatically if the URL starts with https://
        response = urequests.post(url, headers=headers, data=payload)
        print("[SYNC] Success:", response.text)
        response.close()
    except Exception as e:
        print("[SYNC ERROR] Failed to connect to backend:", e)

# ==============================================================================
# 4. MAIN LOOP
# ==============================================================================
while True:
    sync_with_backend()
    # Ping every 60 seconds
    time.sleep(60)
