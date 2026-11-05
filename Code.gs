// ====== À MODIFIER ======
const SHEET_NAME = "Page 2";          // nom exact de l’onglet de données
const CODE_ACCES = "changeme";        // code de consultation (toute l’équipe)
const CODE_ADMIN = "changeme-admin";  // code administrateur (ajout, correction, suppression) : à garder pour toi
// ========================

function feuille_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.getSheets()[1];
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

const norm_ = s => String(s).toLowerCase().replace(/\s+/g, " ").trim();

// Lecture : renvoie toute la base (code de consultation ou administrateur)
function doGet(e) {
  const code = e && e.parameter ? e.parameter.code : "";
  if (code !== CODE_ACCES && code !== CODE_ADMIN) return json_({ error: "code" });
  const tz = Session.getScriptTimeZone();
  const v = feuille_().getDataRange().getValues();
  const rows = v.slice(1)
    .map((r, i) => ({
      n: i + 2,   // numéro de ligne dans le Sheet
      m: r[0], p: r[1], ts: r[2], ti: r[3], pr: r[4], t: r[5], a: r[6], c: r[7],
      d: r[8] instanceof Date ? Utilities.formatDate(r[8], tz, "yyyy-MM-dd") : String(r[8] || "")
    }))
    .filter(r => String(r.m).trim() !== "");
  return json_({ rows: rows });
}

// Écriture : ajout, correction, suppression (code administrateur obligatoire)
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ error: "format" }); }
  if (body.code !== CODE_ADMIN) return json_({ error: "code" });

  const action = body.action || "add";
  const d = body.data || {};
  if (action !== "delete" && (!String(d.m || "").trim() || !String(d.p || "").trim())) return json_({ error: "champs" });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = feuille_();
    const toutes = sh.getDataRange().getValues();
    const existants = toutes.slice(1);
    const reprendre = (valeur, col) => {
      const trouve = existants.find(r => norm_(r[col]) === norm_(valeur));
      return trouve ? trouve[col] : String(valeur).replace(/\s+/g, " ").trim();
    };

    if (action === "add") {
      sh.appendRow([
        reprendre(d.m, 0), reprendre(d.p, 1),
        d.ts || "", d.ti || "", d.pr || "", d.t || "", d.a || "", d.c || "",
        new Date()
      ]);
      return json_({ ok: true });
    }

    // correction / suppression : on vérifie que la ligne visée est bien celle que l’appli a affichée
    const n = Number(body.row), o = body.orig || {};
    if (!n || n < 2 || n > toutes.length) return json_({ error: "obsolete" });
    const ligne = toutes[n - 1];
    if (norm_(ligne[0]) !== norm_(o.m) || norm_(ligne[1]) !== norm_(o.p)) return json_({ error: "obsolete" });

    if (action === "delete") {
      sh.deleteRow(n);
    } else if (action === "edit") {
      // colonnes A à H ; la date de validation (colonne I) est conservée
      sh.getRange(n, 1, 1, 8).setValues([[
        reprendre(d.m, 0), reprendre(d.p, 1),
        d.ts || "", d.ti || "", d.pr || "", d.t || "", d.a || "", d.c || ""
      ]]);
    } else {
      return json_({ error: "format" });
    }
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}
