# Telegram buyurtmalarini ulash — ALI DIGITAL HUB V10

Bot: **@AliDigitalHubOrdersBot** (BotFather'da yaratilgan). Botga mijozlar yozishi shart emas: sayt formasi orqali sizga xabar yetkaziladi.

## 1. Botni shaxsiy Telegram chattingizga bog‘lash

1. Telegramda **@AliDigitalHubOrdersBot** ochib **Start** yoki `/start` bosing. Shu amal botga sizga xabar yuborishga ruxsat beradi.
2. Telegramda **@BotFather** → `/mybots` → **@AliDigitalHubOrdersBot** → **API Token**. Tokenni ko‘chirib oling. Tokenni hech kimga jo‘natmang, skrinshotda ko‘rsatmang.

## 2. PowerShell / VS Code

1. ZIP ichidagi `ALI_DIGITAL_HUB_V10_TELEGRAM_ORDERS` papkasini oching. `package.json` shu papkada turganiga ishonch hosil qiling.
2. Terminalda quyidagilarni yozing:

```powershell
Copy-Item .env.example .env
notepad .env
```

`.env` ichida quyidagilar bo‘lishi kerak (**token va chat ID misol qiymatlariga emas, o‘zingiznikiga almashtiring**):

```dotenv
NODE_ENV=development
ADMIN_KEY=MENING_ENG_KAMIDA_32_BELGILI_MAXFIY_ADMIN_KALITIM
TELEGRAM_BOT_TOKEN=BU_YERGA_BOTFATHER_BERGAN_HAQIQIY_TOKEN
TELEGRAM_CHAT_ID=BU_YERGA_SIZNING_SHAXSIY_CHAT_ID
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

3. Avval faqat haqiqiy `TELEGRAM_BOT_TOKEN` ni qo‘ying va faylni saqlang. So‘ng:

```powershell
npm run telegram:chatid
```

Terminal sizning profilingiz uchun `TELEGRAM_CHAT_ID=...` ko‘rsatadi. Shu **raqamni** `.env` faylidagi `TELEGRAM_CHAT_ID=` yoniga qo‘ying.

4. Tekshiruv:

```powershell
npm run telegram:test
npm start
```

Brauzerda `http://localhost:3000` oching. Test buyurtma yuboring. Botga xabar kelishi kerak. **Mijozning telefon/Telegram, ixtiyoriy email, xizmat, narx va izohi bitta xabarda keladi.**

## 3. Render (noutbuk o‘chirilganda ham ishlashi uchun)

Renderda **Node.js Web Service**, `Start Command: npm start` bo‘lsin. **Static Site** bo‘lsa `/api/orders` ishlamaydi. Render → Web Service → **Environment** bo‘limiga `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `ADMIN_KEY` ni kiriting. `NODE_ENV=production` va redeploy qiling. `.env` faylini GitHubga joylamang.

**Eslatma:** Telegramga xabar yetkazilishi haqiqiy token/chat ID, Telegram va Render serverining ishlashiga bog‘liq. Render bepul rejadagi server uyqu holatidan uyg‘onganda birinchi so‘rov kechikishi mumkin. Agar haqiqiy bot xabari kelmasa, `npm run telegram:test` natijasini tekshiring. Supabase ixtiyoriy: faqat Renderda admin buyurtmalar tarixini saqlash/ko‘rish uchun kerak.

## Kontaktlar

- Saytda mijozlar ko‘radigan Telegram: `@dnyrv_001`
- Telefon: `+998 77 688 20 12`
- Gmail: `muhammadalidonyorov2012@gmail.com`
- Buyurtma bildirishi yuboriladigan bot: `@AliDigitalHubOrdersBot`

Gmail saytning `mailto:` aloqasi sifatida ishlaydi. **Bu Gmail inboxga avtomatik xat yuborish emas**; buyurtmalar Telegram botga boradi.
