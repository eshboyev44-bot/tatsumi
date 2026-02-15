# Tatsumi Mobile (Expo + iOS)

Bu papka React Native Expo ilovasi uchun boshlang'ich skelet.

## 1) Tayyorlash

`mobile/env.example` ni `mobile/.env` ga nusxa qiling:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

## 2) O'rnatish

```bash
cd mobile
npm install
```

## 3) iPhone'da ishga tushirish (emulatorsiz)

```bash
npm run start
```

Keyin iPhone'dagi Expo Go bilan QR kodni oching.

Tunnel kerak bo'lsa (ngrok), alohida script:

```bash
npm run start:tunnel
```

## 4) Hozir ishlaydigan qismlar

- Supabase auth (email + password)
- Session persist (AsyncStorage)
- Suhbatlar ro'yxati
- User search + yangi suhbat ochish
- Suhbat ichida realtime xabarlar
- Xabar yuborish va o'qilgan check

## 5) Keyingi bosqichlar

- Typing indicator
- Reply, image upload
- Push notifications (expo-notifications)

## 6) Push notification sozlash

`mobile/.env` ichiga Expo project id qo'shing:

```bash
EXPO_PUBLIC_EXPO_PROJECT_ID=...
```

Supabase SQL editor’da quyini ishga tushiring:

- `supabase/migration_push_notifications.sql`

Edge function deploy qiling:

```bash
supabase functions deploy send-push-notification
```

Push function uchun secretlar:

```bash
supabase secrets set SERVICE_ROLE_KEY=...
```

## 7) iOS build (EAS)

`mobile` ichida:

```bash
npm install
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile preview
```

Agar App Store uchun release build kerak bo'lsa:

```bash
npx eas-cli@latest build --platform ios --profile production
```
