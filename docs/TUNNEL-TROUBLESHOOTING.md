# Expo tunnel troubleshooting

When **Expo Go** shows `java.io.IOException: Failed to download remote update` with `npx expo start --tunnel`, the app on your phone is failing to download the JS bundle from the tunnel URL. Try these in order.

## 1. Match Expo Go to your SDK

Your project is **Expo SDK 54**. Use **Expo Go** that supports SDK 54:

- **Android**: Play Store → Expo Go → ensure it’s the latest (or the version that supports SDK 54).
- If you recently upgraded the project, install the **Expo Go** version that matches SDK 54 (see [Expo Go versions](https://expo.dev/go)).

## 2. Start with a clean tunnel and cache

```bash
npx expo start --tunnel -c
```

- `-c` clears Metro’s cache.
- Wait until the terminal shows the **tunnel URL** (e.g. `exp://xxx.ngrok.io`) before scanning.

## 3. Firewall (Windows)

Allow Metro so the tunnel can serve the bundle:

**PowerShell (Run as Administrator):**

```powershell
New-NetFirewallRule -DisplayName "Expo Metro" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow
New-NetFirewallRule -DisplayName "Expo Metro 8080" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
```

Then run `npx expo start --tunnel -c` again.

## 4. Same Wi‑Fi and no VPN

- Phone and PC should be on the **same Wi‑Fi** (or use USB, see below).
- Turn off **VPN** on both PC and phone.
- If you use a **guest** or **isolated** Wi‑Fi, switch to the main network.

## 5. Try LAN instead of tunnel

If you’re on the same network, LAN often works when tunnel fails:

```bash
npx expo start -c
```

Then in Expo Go:

- Scan the QR code from the terminal, or
- Manually enter the URL shown (e.g. `exp://192.168.x.x:8081`).

## 6. Use USB (Android)

With the phone connected by USB and USB debugging enabled:

```bash
npx expo start -c
```

Then press `a` in the terminal to open the app on the Android device. No tunnel or QR needed.

## 7. Restart tunnel and Expo Go

- Stop the dev server (Ctrl+C).
- On the phone: **force‑close Expo Go** (swipe away from recents).
- Clear Expo Go app cache: **Settings → Apps → Expo Go → Storage → Clear cache**.
- Start again: `npx expo start --tunnel -c` and scan the **new** QR code.

## 8. Router / network

- Restart your router.
- If possible, try another network (e.g. phone hotspot for the PC) to see if the issue is network‑specific.

## 9. Install @expo/ngrok explicitly (tunnel only)

If the tunnel never starts or always times out:

```bash
npm install -D @expo/ngrok
```

Then run:

```bash
npx expo start --tunnel -c
```

---

**Summary:** Most “Failed to download remote update” cases with tunnel are fixed by (1) matching Expo Go to SDK 54, (2) firewall rules for 8080/8081, (3) `-c` and a fresh tunnel, and (4) using LAN or USB when tunnel is unreliable.
