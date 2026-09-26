from datetime import datetime, timezone
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
doc_ref = db.collection.return_value.document.return_value

# --- upload & analisis ---
assert up(b"bukan pdf").status_code == 415
assert up(b"%PDF" + b"0" * main.MAX_PDF_BYTES).status_code == 413
assert up(b"%PDF-1.7 rusak").status_code == 422
assert up(make_pdf()).status_code == 422  # halaman kosong = seperti hasil scan
assert up(make_pdf("Pasal 1 Penjual menjual tanah")).status_code == 202
assert "Pasal 1 Penjual" in doc_ref.set.call_args.args[0]["text"]  # teks disimpan untuk konteks chat
saved = doc_ref.update.call_args.args[0]
assert saved["status"] == "done" and saved["risks"][0]["pasal"] == "Pasal 5"

snap = doc_ref.get.return_value
snap.exists, snap.get.return_value = True, "user-b"
assert c.get(f"/analysis/{main.uuid4()}").status_code == 404  # punya orang lain

main.analyze = lambda text: {"summary": "x", "risks": [{"level": "parah"}]}  # output AI ngaco
up(make_pdf("Pasal 1"))
assert doc_ref.update.call_args.args[0]["status"] == "failed"

# --- chat ---
calls = []
def fake_jawab(pertanyaan, riwayat, konteks, **k):
    calls.append((pertanyaan, riwayat, konteks))
    return {"jawaban": "ok", "sumber": [], "di_luar_cakupan": False, "status": "ok", "disclaimer": "d"}
main.jawab_chat = fake_jawab

hist = MagicMock()
hist.to_dict.return_value = {"pertanyaan": "Apa itu HGB?", "jawaban": "HGB adalah...", "sumber": [],
                             "status": "ok", "created_at": datetime.now(timezone.utc)}
db.collection.return_value.where.return_value.where.return_value.stream.return_value = [hist]

r = c.post("/chat", json={"pertanyaan": "kalau SHM?"})
assert r.json() == fake_jawab("", [], None)  # dikembalikan apa adanya
assert calls[0] == ("kalau SHM?", [{"role": "user", "content": "Apa itu HGB?"},
                                  {"role": "assistant", "content": "HGB adalah..."}], None)
assert db.collection.return_value.add.call_args.args[0]["document_id"] is None

assert c.post("/chat", json={"pertanyaan": "Pasal 1?", "document_id": str(main.uuid4())}).status_code == 404  # dokumen orang lain
snap.get.return_value = "user-a"
snap.to_dict.return_value = {"user_id": "user-a", "text": "Pasal 1 Penjual menjual tanah"}
c.post("/chat", json={"pertanyaan": "Pasal 1?", "document_id": str(main.uuid4())})
assert calls[-1][2] == "Pasal 1 Penjual menjual tanah"  # konteks_dokumen = teks dokumen user

db.collection.return_value.add.reset_mock()
main.jawab_chat = lambda *a, **k: {"jawaban": "Maaf", "sumber": [], "di_luar_cakupan": False, "status": "error", "disclaimer": "d"}
assert c.post("/chat", json={"pertanyaan": "Apa itu SHM?"}).json()["status"] == "error"
assert not db.collection.return_value.add.called  # jawaban error tidak disimpan

assert c.get("/chat/history").json()[0]["pertanyaan"] == "Apa itu HGB?"

main.app.dependency_overrides.clear()
assert c.get("/chat/history").status_code == 401  # tanpa token ditolak
print("OK")
