# 🤖 Подключение Telegram-бота к MAHAN WebApp

## 📋 Полная инструкция по настройке

### **Шаг 1: Создание Telegram Bot**

1. Откройте Telegram и найдите бота **@BotFather**
2. Отправьте команду: `/newbot`
3. Ответьте на вопросы:
   - **Название бота:** `MAHAN` 
   - **Юзернейм:** `mahan_bot` (или `mahan_[ваше_имя]_bot`)

4. **BotFather вернет:**
   ```
   🎉 Done! Congratulations on your new bot. You will find it at t.me/mahan_bot
   Use this token to access the HTTP API: 123456789:ABCdefGHIjklmnOPQrstuvWXYZabcdefgh
   ```

5. **Скопируйте и сохраните токен** (потребуется позже)

---

### **Шаг 2: Развёртывание WebApp**

#### **Вариант A: GitHub Pages** ✅ (Рекомендуется)

1. Перейдите в папку `mahan.app`
2. Создайте папку `docs/`
3. Скопируйте туда файлы:
   ```
   docs/
   ├── index.html
   ├── style.css
   └── app.js
   ```

4. Закоммитьте изменения:
   ```bash
   git add docs/
   git commit -m "Deploy: Add WebApp to GitHub Pages"
   git push
   ```

5. Перейдите в **Settings** → **Pages**
6. Выберите:
   - **Source:** `Deploy from a branch`
   - **Branch:** `feature/telegram-webapp`
   - **Folder:** `/docs`

7. Сохраните. GitHub Pages развернёт ваш app по адресу:
   ```
   https://petrovaalbina699-ux.github.io/mahan.app/
   ```

#### **Вариант B: Vercel** (альтернатива)

1. Перейдите на [vercel.com](https://vercel.com)
2. Импортируйте репозиторий `mahan.app`
3. Установите root directory: `webapp`
4. Разверните проект
5. Копируйте финальный URL

#### **Вариант C: Netlify** (альтернатива)

1. Перейдите на [netlify.com](https://netlify.com)
2. Соедините с GitHub
3. Выберите `mahan.app` репозиторий
4. Установите publish directory: `webapp`
5. Разверните

---

### **Шаг 3: Обновление Google Apps Script URL в WebApp**

1. Откройте `webapp/app.js`
2. Найдите строку 4:
   ```javascript
   GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/d/YOUR_SCRIPT_ID/usercontent',
   ```

3. Замените на вашу URL (из шага 3 в основном гайде)

---

### **Шаг 4: Регистрация WebApp в BotFather**

1. Откройте Telegram, напишите **@BotFather**
2. Отправьте команду: `/setcommands`
3. Выберите бота (например, `@mahan_bot`)

4. Отправьте команды в формате:
   ```
   start - Открыть MAHAN приложение
   help - Справка
   ```

5. Нажмите Done

---

### **Шаг 5: Регистрация WebApp URL**

1. В **@BotFather** отправьте: `/setcommands`
2. Выберите вашего бота
3. Отправьте:
   ```
   web_app - Открыть приложение
   ```

Нажмите "Done"

**Или альтернативный метод через меню-кнопку:**

1. В @BotFather отправьте: `/newcommands`
2. Выберите бота
3. Установите кнопку открытия WebApp

---

### **Шаг 6: Добавление кнопки в бота (Inline Keyboard)**

Обновите `backend/Code.gs`, добавив функцию для отправки кнопки:

```javascript
// Отправить кнопку пользователю
function sendWebAppButton(telegramUserId) {
    const BOT_TOKEN = 'YOUR_BOT_TOKEN'; // Замените на ваш токен
    const WEBAPP_URL = 'https://petrovaalbina699-ux.github.io/mahan.app/'; // Ваш URL

    const payload = {
        chat_id: telegramUserId,
        text: '👋 Добро пожаловать в MAHAN!\n\nНажмите кнопку ниже, чтобы открыть приложение:',
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: '📱 Открыть MAHAN',
                        web_app: {
                            url: WEBAPP_URL
                        }
                    }
                ]
            ]
        }
    };

    const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    };

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const response = UrlFetchApp.fetch(url, options);
    
    return JSON.parse(response.getContentText());
}
```

---

### **Шаг 7: Создание Webhook для команды /start**

В `backend/Code.gs` добавьте обработчик /start команды:

```javascript
// Обработать команду /start
function handleTelegramUpdate(payload) {
    try {
        const update = JSON.parse(payload);
        
        if (update.message && update.message.text === '/start') {
            const chatId = update.message.chat.id;
            const telegramId = update.message.from.id;
            
            // Отправить приветственное сообщение с кнопкой
            sendWebAppButton(telegramId);
            
            return sendSuccess({ message: 'Sent WebApp button' });
        }
        
        return sendSuccess({ message: 'Update processed' });
    } catch (error) {
        return sendError('Error: ' + error);
    }
}

// Получить обновления от Telegram
function doGet(e) {
    return HtmlService.createHtmlOutput('Telegram WebApp');
}
```

---

### **Шаг 8: Регистрация Webhook в Telegram**

1. Откройте Google Apps Script проект
2. Развёртайте как **Web app** (если ещё не развёрнули)
3. Скопируйте **Deployment URL**

4. Установите Webhook, выполнив запрос в браузере:
   ```
   https://api.telegram.org/bot{BOT_TOKEN}/setWebhook?url={DEPLOYMENT_URL}
   ```

**Где:**
- `{BOT_TOKEN}` - ваш токен от BotFather (123456789:ABCdefGHIjklmnOPQrstuvWXYZabcdefgh)
- `{DEPLOYMENT_URL}` - ваша Google Apps Script URL

**Пример:**
```
https://api.telegram.org/bot123456789:ABCdefGHIjklmnOPQrstuvWXYZabcdefgh/setWebhook?url=https://script.google.com/macros/d/YOUR_SCRIPT_ID/usercontent
```

---

### **Шаг 9: Тестирование**

1. Откройте Telegram
2. Найдите вашего бота (например, `@mahan_bot`)
3. Отправьте `/start`
4. Нажмите на кнопку "📱 Открыть MAHAN"
5. WebApp должен загрузиться! 🎉

---

## 🔐 Безопасность & Best Practices

### ✅ Обязательно:
- ✅ Используйте **HTTPS** (GitHub Pages автоматически)
- ✅ Проверяйте `initData` от Telegram перед обработкой
- ✅ Не храните токен бота в исходном коде
- ✅ Используйте environment переменные

### 🔒 Проверка подписи Telegram:
```javascript
function verifyTelegramWebAppData(webAppData) {
    // Telegram отправляет подписанные данные в initData
    // Всегда проверяйте подпись перед доверием данным
    
    const parts = webAppData.split('\n');
    const hash = parts.pop().split('=')[1];
    
    // Реальная проверка требует HMAC-SHA256
    // Это базовый пример
    return true; // Упрощённо для примера
}
```

---

## 📱 Команды бота

Установите команды в **@BotFather** с помощью `/setcommands`:

```
start - Открыть приложение MAHAN
help - Справка и контакты
orders - Посмотреть мои заказы
reports - Отчеты по сменам
```

---

## 🐛 Troubleshooting

| Проблема | Решение |
|---------|----------|
| "WebApp not found" | Проверьте URL в BotFather, убедитесь HTTPS |
| Кнопка не отправляется | Проверьте токен бота и Webhook |
| "Unauthorized" | Убедитесь, что Google Apps Script развёрнут как "Anyone" |
| WebApp не загружается | Очистите кэш, проверьте CORS и HTTPS |

---

## 📊 Финальная архитектура

```
┌─────────────────────────────────────┐
│      Пользователь (Telegram)        │
└────────────────┬────────────────────┘
                 │
        ┌────────▼────────┐
        │   @mahan_bot    │
        │   (Telegram)    │
        └────────┬────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
┌───▼────────────┐   ┌───────▼──────────┐
│  WebApp URL    │   │  Google Apps     │
│  (GitHub Pages)    │  Script Webhook  │
│  ✓ index.html  │   │  (Backend)       │
│  ✓ app.js      │   │  ✓ Auth          │
│  ✓ style.css   │   │  ✓ Save Data     │
└───┬────────────┘   └───────┬──────────┘
    │                        │
    └────────────┬───────────┘
                 │
          ┌──────▼───────┐
          │  Google Sheet │
          │  (Database)  │
          └──────────────┘
```

---

## ✅ Готово!

Ваше приложение MAHAN полностью подключено к Telegram! 🎉

**Следующие шаги:**
1. Откройте `@mahan_bot` в Telegram
2. Отправьте `/start`
3. Нажмите кнопку открытия приложения
4. Начните использовать MAHAN! 📊🛍️✅

---

**Вопросы? Проблемы?**
📧 Email: petrovaalbina699@gmail.com
🐙 GitHub: petrovaalbina699-ux/mahan.app

**Последнее обновление:** 15.06.2026
