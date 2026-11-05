# ALI DIGITAL HUB V10 — Premium site + Telegram buyurtmalar

V9 premium dizayn, 20 ta haqiqiy veb-sayt/ilova interfeysi maketi, TOP 3 va katalog saqlandi.

## Yangiliklar

- Sahifaning **Aloqa** bo‘limida telefon, Telegram va Gmail to‘liq yozilgan, bosilganda mos ravishda qo‘ng‘iroq, Telegram va email dasturini ochadi.
- Buyurtma formasida majburiy mijoz aloqa maydoni va **ixtiyoriy email** mavjud.
- Buyurtma yuborilsa, server uni @AliDigitalHubOrdersBot orqali `TELEGRAM_CHAT_ID` ga **bitta xabarda** yuboradi: ID, sana, xizmat, boshlang‘ich narx, ism, mijoz aloqa ma’lumoti, email, izoh.
- Maxfiy bot tokeni brauzerga chiqarilmaydi; faqat server `.env` va Render Environment da saqlanadi.

## Ishga tushirish (PowerShell)

1. Eski server terminalida `Ctrl+C`.
2. ZIPni oching. VS Code’da `ALI_DIGITAL_HUB_V10_TELEGRAM_ORDERS` papkasini oching.
3. Terminalga:

```powershell
Copy-Item .env.example .env
notepad .env
```

4. BotFather tokeni va chat ID ni sozlash uchun **TELEGRAM_ENV_SOZLASH.md** ni ko‘ring. Keyin:

```powershell
npm run telegram:chatid
npm run telegram:test
npm start
```

5. `http://localhost:3000` ni oching. Buyurtma berishni haqiqiy bot bilan sinang.

## Narxlar va rasmlar

`catalog.json` faylidagi `price` ni o‘zgartiring. Suratlar `assets/previews/` ichida, hammasi lokal. Ular tashqi internet fotolari bilan o‘zgarmaydi.

## Render

Bepul Renderda **Node.js Web Service**, `Start Command: npm start`, `NODE_ENV=production` va `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `ADMIN_KEY` ni Web Service → Environment bo‘limida kiriting. `.env` faylini GitHubga yuklamang. Supabase saqlash tizimi bo‘lmasa productionda buyurtmalar botga keladi, ammo admin panelning doimiy ro‘yxati ishlamaydi.

## Tekshirish

```powershell
npm test
```

Avtomatik testlar haqiqiy Telegram hisobingiz bilan emas, maxsus test serveri orqali o‘tkaziladi; haqiqiy bot uchun `npm run telegram:test` shart.
