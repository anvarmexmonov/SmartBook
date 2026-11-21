# SmartBook

Huquqiy ta’lim uchun raqamli kutubxona va darslik yaratish platformasi (LexHackathon, TDYU).
Bu faqat frontend prototip: backend, ma’lumotlar bazasi yoki API kalitlari kerak emas.

## Talablar

- **Node.js 18 yoki undan yangi versiya** (https://nodejs.org saytidan yuklab oling)

Versiyani tekshirish:

```bash
node -v
```

## O‘rnatish

Loyiha papkasida terminalni oching va quyidagini bajaring:

```bash
npm install
```

## Ishga tushirish

```bash
npm run dev
```

So‘ng brauzerda **http://localhost:5173** manzilini oching.

## Tizimga kirish

Demo hisoblardan birini ishlating yoki “Sign Up” sahifasida o‘z hisobingizni yarating.

| Rol | Email | Parol |
| --- | --- | --- |
| Talaba | `student@smartbook.demo` | `student-demo` |
| Professor | `professor@smartbook.demo` | `professor-demo` |

Rolni almashtirish uchun yuqori o‘ng burchakdagi hisob menyusidan chiqing (Log out) va boshqa hisob bilan kiring.

## Production uchun yig‘ish (ixtiyoriy)

```bash
npm run build
npm run preview
```

So‘ng **http://localhost:4173** manzilini oching.

## Eslatmalar

- Barcha ma’lumotlar (hisoblar, o‘qish jarayoni, kitoblar) faqat brauzeringizda saqlanadi.
- Boshidan boshlash uchun istalgan sahifa pastidagi **Reset demo data** tugmasini bosing.
- AI Tutor va Lex.uz yangilanishlari namoyish uchun simulyatsiya qilingan. Kitoblar va shaxslar to‘qima demo kontentdir.
