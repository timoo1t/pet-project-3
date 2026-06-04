# Генератор поздравлений Pro

Desktop-приложение на Flask с веб-интерфейсом для создания поздравлений по шаблонам.

## Запуск

**Готовый exe (Windows):**
```
dist\GreetingGeneratorPro.exe
```
Откроется браузер на `http://127.0.0.1:5000`. История сохраняется в `dist\history.json`.

**Из исходников:**
```bash
pip install -r webgui/requirements.txt
python main.py
```

## Пересборка exe

```bash
pip install pyinstaller
pyinstaller GreetingGeneratorPro.spec
```

## Структура

- `main.py` — точка входа, запуск сервера и браузера
- `webgui/` — Flask-приложение, шаблоны и фронтенд
- `dist/GreetingGeneratorPro.exe` — собранное приложение
- `Пользовательский.png` / `Техническая.png` — UML-диаграммы
