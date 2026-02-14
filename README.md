# Tatsumi Chat (Next.js + Supabase + Vercel + Auth)

Bu loyiha Supabase Realtime + Supabase Auth bilan ishlaydigan chat app.

## 1. Supabase tayyorlash

1. Supabase project oching.
2. `SQL Editor` ichida `supabase/schema.sql` faylidagi SQL ni ishga tushiring.
3. `Authentication -> Providers -> Email` yoqilganligini tekshiring.
4. `Settings -> API` ichidan quyidagi qiymatlarni oling:
- `Project URL`
- `publishable key` (yoki anon public key)

Eslatma: chatga xabar yuborish endi faqat login bo'lgan userga ruxsat beradi (`authenticated` insert policy).

## 2. Lokal ishga tushirish

1. `.env.local` faylga env kiriting:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_publishable_or_anon_key
```

2. Dependency va dev server:

```bash
npm install
npm run dev
```

3. Browserda oching: `http://localhost:3000`

## 3. Vercel deploy

1. Loyihani GitHub ga push qiling.
2. Vercel da yangi project ochib shu repoga ulang.
3. `Environment Variables` ga quyidagilarni kiriting:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy qiling.

## Auth flow

- `Sign up`: email + password + display name
- `Sign in`: email + password
- `Sign out`: chat ichidan chiqish tugmasi
- `messages.user_id`: `auth.uid()` bilan policy orqali tekshiriladi

## Tuzilma

- `app/page.tsx`: sahifa kompozitsiyasi
- `src/lib/supabaseClient.ts`: Supabase client
- `components.json`: shadcn/ui konfiguratsiyasi
- `src/components/ui/*`: shadcn uslubidagi asosiy UI primitives
- `src/features/chat/components/*`: chatga xos UI komponentlar
- `src/features/chat/useAuth.ts`: auth hook
- `src/features/chat/useChatMessages.ts`: realtime chat hook
- `src/features/chat/utils.ts`: helper funksiyalar
- `supabase/schema.sql`: table + RLS policy + auth-based insert + realtime publication
