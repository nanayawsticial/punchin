# PunchIn — Attendance Tracking System

A modern, real-time employee attendance tracking platform with hardware terminal integration.

## Features

- 🕐 **Real-time Clock In/Out** — Web browser or RFID hardware terminal
- 📡 **Live Presence Feed** — See who's in the office right now via WebSocket
- 🔧 **Hardware Integration** — Raspberry Pi Pico W RFID terminals with offline queue
- 📊 **Reports & Timesheets** — Daily, weekly, and monthly attendance summaries
- 🗺️ **Geo-fencing** — Location-based attendance validation
- 🌙 **Dark Mode** — Beautiful warm-toned design in both themes
- 📱 **Mobile-first** — Full PWA with bottom tab navigation

## Architecture

```
punchin/
├── app/          Next.js 15 frontend (Vercel)
└── api/          Fastify backend    (Render)
```

## Hardware Compatibility

Compatible with Pico RFID firmware:
- Device: Raspberry Pi Pico 2 W + MFRC522 + ILI9341 TFT
- Auth header: `X-Device-Key`
- Punch endpoint: `/api/attendance/hardware-punch`

## License

MIT — STEMAIDE Africa Limited
