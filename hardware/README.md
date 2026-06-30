# IWMS Pico Hardware Firmware

This directory contains the MicroPython firmware for the physical attendance terminal (Raspberry Pi Pico W).

## Setup Instructions

1. **Copy Secrets**: 
   Open `secrets.py`, fill in your WiFi credentials, your production `API_BASE` (e.g. `https://your-domain.com:3001`), and your hardware `DEVICE_KEY`.
2. **Flash to Pico**:
   Use Thonny to upload `main.py` and `secrets.py` to the Raspberry Pi Pico flash drive.
3. **Run**:
   Once uploaded, the script will run automatically on boot. 

## 🚨 Security Lockdown & Developer Mode

For security, `main.py` explicitly **disables the `Ctrl+C` REPL interrupt** using `micropython.kbd_intr(-1)`. This guarantees that if a bad actor steals the device and plugs it into their laptop, they cannot stop the script to read `secrets.py` or `main.py` via Thonny.

### How to Edit Your Code (Developer Mode)
Since REPL is locked, you must use the hardware override to edit your code:
1. Unplug the Pico from USB power.
2. Connect a jumper wire between **GPIO Pin 15 (GP15)** and **GND**.
3. Plug the Pico back into your computer.
4. The system will detect the jumper and leave REPL unlocked. You can now use Thonny to stop the script, edit `secrets.py` or `main.py`, and save.
5. Unplug, remove the jumper, and plug it back in to return to locked production mode.
