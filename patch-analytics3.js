import fs from 'fs';
let code = fs.readFileSync('src/components/AdminAnalytics.tsx', 'utf-8');

code = code.replace(
`    } catch (err: any) {
      console.error('Ошибка загрузки данных админ-панели:', err);
      setError(err.message || 'Произошла ошибка');
      setLoading(false);
    }`,
`    } catch (err: any) {
      console.error('Ошибка загрузки данных админ-панели:', err);
      // If it's a JSON parse error (meaning we got HTML instead of JSON)
      if (err.name === 'SyntaxError' || err.message.includes('JSON')) {
         setError('Ошибка формата ответа (возможно, нужна перезагрузка страницы или обновление Share-ссылки).');
      } else {
         setError(err.message || 'Произошла ошибка');
      }
      setLoading(false);
    }`
);

fs.writeFileSync('src/components/AdminAnalytics.tsx', code);
console.log('Patched AdminAnalytics.tsx catch block');
