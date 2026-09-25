from unittest.mock import MagicMock

import pymupdf
from fastapi.testclient import TestClient

import main


def make_pdf(text=""):
    doc = pymupdf.open()
    page = doc.new_page()
    if text:
        page.insert_text((72, 72), text)
    return doc.tobytes()


db = MagicMock()
main.fb = lambda: db
main.app.dependency_overrides[main.current_user] = lambda: "user-a"
c = TestClient(main.app)
up = lambda b: c.post("/upload", files={"file": ("x.pdf", b, "application/pdf")})

assert up(b"bukan pdf").status_code == 415
assert up(b"%PDF" + b"0" * main.MAX_PDF_BYTES).status_code == 413
assert up(b"%PDF-1.7 rusak").status_code == 422
assert up(make_pdf()).status_code == 422  # halaman kosong = seperti hasil scan
assert up(make_pdf("Pasal 1 Penjual menjual tanah")).status_code == 202
saved = db.collection.return_value.document.return_value.update.call_args.args[0]
assert saved["status"] == "done" and saved["risks"][0]["pasal"] == "Pasal 5"

snap = db.collection.return_value.document.return_value.get.return_value
snap.exists, snap.get.return_value = True, "user-b"
assert c.get(f"/analysis/{main.uuid4()}").status_code == 404  # punya orang lain

main.analyze = lambda text: {"summary": "x", "risks": [{"level": "parah"}]}  # output AI ngaco
up(make_pdf("Pasal 1"))
assert db.collection.return_value.document.return_value.update.call_args.args[0]["status"] == "failed"

assert c.post("/chat", json={"question": "Apa itu SHM?"}).json()["sources"]
db.collection.return_value.add.reset_mock()
main.answer = lambda q: 1 / 0  # LLM error
r = c.post("/chat", json={"question": "Apa itu SHM?"})
assert r.status_code == 200 and r.json() == main.CHAT_FALLBACK.model_dump()
assert not db.collection.return_value.add.called  # fallback tidak disimpan

main.app.dependency_overrides.clear()
assert c.get("/chat/history").status_code == 401  # tanpa token ditolak
print("OK")
