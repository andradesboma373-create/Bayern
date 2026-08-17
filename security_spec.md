# Спецификация безопасности Firestore (Security Spec)

## 1. Инварианты данных (Data Invariants)

1. **Матчи (`matches`)**:
   - Чтение разрешено только пользователю, чей `userId` совпадает с `request.auth.uid`.
   - Создание разрешено только авторизованному пользователю с его собственным `userId`.
   - Обновление запрещено (матчи иммутабельны после записи).
   - Удаление разрешено только владельцу матча (`userId == request.auth.uid`).

2. **Статистика игроков (`playerStats`)**:
   - Чтение разрешено только пользователю, чей `userId` совпадает с `request.auth.uid`.
   - Создание и обновление разрешены только если `userId` в документе равен `request.auth.uid`.

3. **Команды (`teams`)**:
   - Чтение разрешено только если `channelId` равен `request.auth.uid`.
   - Создание, обновление и удаление разрешены только владельцу (`channelId == request.auth.uid`).

4. **Игроки (`players`)**:
   - Чтение разрешено только если `channelId` равен `request.auth.uid`.
   - Создание, обновление и удаление разрешены только владельцу (`channelId == request.auth.uid`).

5. **Турниры (`tournaments`)**:
   - Чтение разрешено только если `userId` равен `request.auth.uid`.
   - Создание, обновление и удаление разрешены только владельцу (`userId == request.auth.uid`).

---

## 2. «Грязная дюжина» вредоносных полезных нагрузок (The "Dirty Dozen" Payloads)

### Payload 1: Подмена ID создателя матча (Identity Spoofing in Matches)
Попытка записать чужой `userId` при создании матча.
```json
{
  "id": "12345",
  "date": "2026-07-16T18:02:06Z",
  "gameMode": "cs2",
  "userId": "another_user_id_123"
}
```

### Payload 2: Внедрение вредоносных полей в матч (Shadow Fields in Matches)
Попытка записать несанкционированные поля вроде `isAdmin: true` в документ матча.
```json
{
  "id": "12345",
  "date": "2026-07-16T18:02:06Z",
  "gameMode": "cs2",
  "userId": "current_user_uid",
  "isAdmin": true,
  "hacked": "yes"
}
```

### Payload 3: Попытка изменения матча (Match Mutation / Mutation Attack)
Попытка обновить уже завершенный симулированный матч.
```json
{
  "team1Score": 16,
  "team2Score": 0
}
```

### Payload 4: Чтение чужой статистики игроков (Cross-User Read on playerStats)
Попытка прочитать статистику игроков другого пользователя.
```javascript
// Querying playerStats belonging to another userId
db.collection('playerStats').where('userId', '==', 'another_user_id_123').get()
```

### Payload 5: Запись статистики игрока с чужим userId (Identity Spoofing in playerStats)
Попытка создать статистику игрока, приписав её другому пользователю.
```json
{
  "nickname": "s1mple",
  "teamName": "NAVI",
  "matches": 10,
  "kills": 300,
  "deaths": 150,
  "userId": "victim_user_id"
}
```

### Payload 6: Создание команды под чужим channelId (Identity Spoofing in Teams)
Попытка создать команду для чужого канала.
```json
{
  "channelId": "victim_channel_id",
  "name": "Astralis",
  "players": []
}
```

### Payload 7: Обновление чужой команды (Cross-User Write on Teams)
Попытка обновить состав команды другого канала.
```javascript
db.collection('teams').doc('another_user_team_id').update({ name: 'Hacked' })
```

### Payload 8: Инъекция недопустимого ID ресурса (Resource ID Poisoning)
Попытка передать гигантский или некорректный ID в качестве ID игрока/документа.
```javascript
db.collection('players').doc('A'.repeat(5000)).set({ ... })
```

### Payload 9: Публикация команды без игроков (Validation Bypass: Empty Players)
Попытка создать команду с некорректной структурой данных.
```json
{
  "channelId": "current_user_uid",
  "name": "Fnatic"
}
```

### Payload 10: Изменение неизменяемого поля в Игроке (Immutable Field Bypass in Players)
Попытка изменить `createdAt` у игрока.
```json
{
  "createdAt": "2020-01-01T00:00:00Z"
}
```

### Payload 11: Подмена ID создателя турнира (Identity Spoofing in Tournaments)
Попытка создать турнир с чужим `userId`.
```json
{
  "name": "Major Championship",
  "userId": "victim_user_id",
  "createdAt": "2026-07-16T18:02:06Z"
}
```

### Payload 12: Неавторизованный список чужих турниров (Query Scraping / Blanket Read on Tournaments)
Попытка получить список всех турниров без фильтрации по собственному `userId`.
```javascript
db.collection('tournaments').get()
```

---

## 3. Скрипт проверки тестов (Test Runner Draft)

Так как среда не всегда содержит полноценную установку эмуляторов Firestore в реальном времени, мы описываем концептуальный тестовый файл, который представляет наши ожидания для аудита.

```typescript
// firestore.rules.test.ts
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

describe('Firestore Security Rules', () => {
  let testEnv: any;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'remixed-project-id',
      firestore: {
        rules: require('fs').readFileSync('firestore.rules', 'utf8')
      }
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  test('Denies Match creation with spoofed userId', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      aliceDb.collection('matches').doc('match_1').set({
        id: 'match_1',
        date: '2026-07-16T18:02:06Z',
        gameMode: 'cs2',
        userId: 'bob'
      })
    );
  });

  test('Denies Match update (matches are immutable)', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      aliceDb.collection('matches').doc('match_1').update({
        team1Score: 16
      })
    );
  });
});
```
