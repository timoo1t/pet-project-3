from flask import Flask, render_template, request, jsonify, send_file
from datetime import datetime
import json
import io
import os

_template_folder = os.environ.get("FLASK_TEMPLATE_FOLDER") or os.path.join(os.path.dirname(__file__), "templates")
_static_folder = os.environ.get("FLASK_STATIC_FOLDER") or os.path.join(os.path.dirname(__file__), "static")

app = Flask(__name__, template_folder=_template_folder, static_folder=_static_folder)

_history_dir = os.environ.get("HISTORY_DIR") or os.path.dirname(__file__)
HISTORY_FILE = os.path.join(_history_dir, "history.json")

GREETING_TYPES = {
    "birthday": "День рождения",
    "wedding": "Свадьба",
    "anniversary": "Годовщина",
    "newyear": "Новый год",
    "8march": "8 марта",
    "23feb": "23 февраля",
    "graduation": "Выпускной",
    "professional": "Профессиональный праздник",
}

TEMPLATES = {
    "birthday": [
        {
            "id": "warm",
            "name": "Тёплое",
            "text": "Дорогой(ая) {name}!\n\nОт всей души поздравляю с {age}-летием! Пусть этот день подарит море улыбок, тёплых объятий и приятных сюрпризов. Желаю крепкого здоровья, неисчерпаемой энергии и исполнения самых заветных желаний.\n\nС наилучшими пожеланиями,\n{sender}",
        },
        {
            "id": "official",
            "name": "Официальное",
            "text": "Уважаемый(ая) {name}!\n\nПримите искренние поздравления с днём рождения. В этот знаменательный день желаем Вам профессиональных успехов, благополучия и реализации всех намеченных планов.\n\nС уважением,\n{sender}",
        },
        {
            "id": "funny",
            "name": "Шуточное",
            "text": "{name}, с днюхой!\n\n{age} — это же расцвет сил! Желаю, чтобы морщины появлялись только от улыбок, седина — только от мудрости, а лишний вес — только от тортика на день рождения.\n\nОбнимаю,\n{sender}",
        },
        {
            "id": "poetic",
            "name": "В стихах",
            "text": "{name}, в твой день рождения\nЖелаю счастья без сомнения,\nЗдоровья, радости, тепла,\nЧтоб жизнь прекрасною была!\n\n{sender}",
        },
    ],
    "wedding": [
        {
            "id": "warm",
            "name": "Тёплое",
            "text": "Дорогие {name}!\n\nПоздравляем вас с днём свадьбы! Пусть ваш союз будет крепким, любовь — взаимной, а дом — полной чашей. Берегите друг друга и пронесите эти чувства через всю жизнь.\n\n{sender}",
        },
        {
            "id": "official",
            "name": "Официальное",
            "text": "Уважаемые молодожёны {name}!\n\nПримите искренние поздравления с днём бракосочетания. Желаем вам семейного благополучия, взаимопонимания и долгих счастливых лет совместной жизни.\n\n{sender}",
        },
    ],
    "anniversary": [
        {
            "id": "warm",
            "name": "Тёплое",
            "text": "{name}, поздравляю с годовщиной!\n\n{age} лет — это серьёзная дата, и за ней стоит большой совместный путь. Пусть впереди будет ещё больше счастливых моментов.\n\n{sender}",
        },
    ],
    "newyear": [
        {
            "id": "warm",
            "name": "Тёплое",
            "text": "{name}, с Новым годом!\n\nПусть наступающий год принесёт радость, исполнение желаний и много светлых дней. Здоровья тебе и твоим близким!\n\n{sender}",
        },
        {
            "id": "official",
            "name": "Официальное",
            "text": "Уважаемый(ая) {name}!\n\nПримите поздравления с наступающим Новым годом. Желаем профессиональных побед, стабильности и реализации намеченных целей.\n\n{sender}",
        },
    ],
    "8march": [
        {
            "id": "warm",
            "name": "Тёплое",
            "text": "Милая {name}!\n\nС праздником весны! Пусть в твоей жизни всегда цветут улыбки, а рядом будут только любящие люди. Будь счастлива каждый день!\n\n{sender}",
        },
    ],
    "23feb": [
        {
            "id": "warm",
            "name": "Тёплое",
            "text": "{name}, с Днём защитника Отечества!\n\nЖелаю мужества, силы, надёжных друзей и крепкого тыла. Пусть жизнь дарит достойные победы.\n\n{sender}",
        },
    ],
    "graduation": [
        {
            "id": "warm",
            "name": "Тёплое",
            "text": "{name}, поздравляю с выпускным!\n\nПозади годы учёбы, впереди — большая жизнь. Пусть выбранный путь окажется именно твоим, а каждая ступенька — на полшага вверх.\n\n{sender}",
        },
    ],
    "professional": [
        {
            "id": "official",
            "name": "Официальное",
            "text": "Уважаемый(ая) {name}!\n\nПоздравляю с профессиональным праздником. Ваш труд достоин уважения. Желаю карьерных высот, интересных проектов и достойной оценки.\n\n{sender}",
        },
    ],
}


def load_history():
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def save_history(items):
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)


def render_template_text(tpl_text: str, data: dict) -> str:
    safe = {
        "name": data.get("name", "").strip() or "друг",
        "age": data.get("age", "").strip() or "",
        "sender": data.get("sender", "").strip() or "",
        "wishes": data.get("wishes", "").strip() or "",
    }
    text = tpl_text
    for k, v in safe.items():
        text = text.replace("{" + k + "}", v)
    if safe["wishes"]:
        text += "\n\nP.S. " + safe["wishes"]
    return text


@app.route("/")
def index():
    return render_template(
        "index.html",
        greeting_types=GREETING_TYPES,
        templates=TEMPLATES,
    )


@app.route("/api/generate", methods=["POST"])
def api_generate():
    data = request.get_json(force=True)
    gtype = data.get("type", "birthday")
    tpl_id = data.get("template_id")

    tpls = TEMPLATES.get(gtype, [])
    if not tpls:
        return jsonify({"error": "Нет шаблонов для этого типа"}), 400

    tpl = next((t for t in tpls if t["id"] == tpl_id), tpls[0])
    text = render_template_text(tpl["text"], data)

    if not data.get("name", "").strip():
        return jsonify({"error": "Укажите имя получателя"}), 400

    entry = {
        "ts": datetime.now().isoformat(timespec="seconds"),
        "type": gtype,
        "type_label": GREETING_TYPES.get(gtype, gtype),
        "template": tpl["name"],
        "name": data.get("name", ""),
        "age": data.get("age", ""),
        "sender": data.get("sender", ""),
        "text": text,
    }
    hist = load_history()
    hist.insert(0, entry)
    hist = hist[:50]
    save_history(hist)

    return jsonify({"text": text, "entry": entry})


@app.route("/api/history", methods=["GET"])
def api_history():
    return jsonify(load_history())


@app.route("/api/history", methods=["DELETE"])
def api_history_clear():
    save_history([])
    return jsonify({"ok": True})


@app.route("/api/download", methods=["POST"])
def api_download():
    data = request.get_json(force=True)
    text = data.get("text", "")
    buf = io.BytesIO(text.encode("utf-8"))
    filename = f"greeting_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    return send_file(buf, as_attachment=True, download_name=filename, mimetype="text/plain")


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
