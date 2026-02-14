# Tatsumi Chat (Next.js + Supabase + Vercel)

Bu loyiha Supabase Realtime orqali ishlaydigan oddiy chat app.

## 1. Supabase tayyorlash

1. Supabase project oching.
2. `SQL Editor` ichida `supabase/schema.sql` faylidagi SQL ni ishga tushiring.
3. `Settings -> API` ichidan quyidagi qiymatlarni oling:
- `Project URL`
- `publishable key` (yoki anon public key)

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

## Tuzilma

- `app/page.tsx`: chat UI, realtime subscribe, message insert
- `src/lib/supabaseClient.ts`: Supabase client
- `supabase/schema.sql`: table + RLS policy + realtime publication
