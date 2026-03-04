# "Failed to download remote update" when scanning QR code

This error usually means your **phone can’t reach your dev server** (Metro). Expo Go is trying to load the app bundle from your PC and the request fails.

## Fix: use tunnel mode

Tunnel gives you a public URL so the phone doesn’t need to be on the same Wi‑Fi as your PC.

1. **Stop** any running Expo process (Ctrl+C).
2. **Start with tunnel:**
   ```bash
   npx expo start --tunnel
   ```
   Or: `npm run start:tunnel`
3. **Wait** for the tunnel URL to appear (can take 30–60 seconds).
4. **Scan the new QR code** with Expo Go.

The first load over tunnel may be slower; after that it should be fine.

## If tunnel is slow or fails

- **Use your phone as a hotspot:** Turn on mobile hotspot on your Android, connect your **PC** to that Wi‑Fi, then run `npx expo start` (no tunnel). Scan the QR code. Both devices are then on the same network.
- **Check network:** Disable VPN on phone and PC. Ensure no firewall is blocking Node/Metro (port 8081 or the tunnel port).
- **Restart:** Fully close Expo Go on the phone, stop Expo on the PC, then run `npx expo start --tunnel` again and scan.

## Note

`updates.enabled: false` in `app.json` only disables **EAS OTA updates**. It does not fix “phone can’t reach dev server.” For that you need tunnel or same network (e.g. hotspot).
