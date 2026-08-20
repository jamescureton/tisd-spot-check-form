import { useState, useEffect, useRef } from "react";

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzun92OtVuFcWlTd2pNDHT8MVlGscRiC39BXIeuM33sN6x0Viwal61WbgzQK4BbF0fZ/exec";

const SHEET_ID = "1_0Q-ufFrf7kYal3b4JB2vIEFv2A4iSmAIRxtE8lL-5k";

const NAVY = "#1B2A4A";
const RED = "#C0272D";
const GOLD = "#C9982A";
const TEAL = "#2A7F8F";
const WHITE = "#FFFFFF";

// sessionStorage keys — grouped so they're easy to find/clear
const SS = {
  observer: "sso_observer",
  localId: "sso_localId",
  observerEmail: "sso_observerEmail",
  orgs: "sso_orgs",                 // NEW: 9-digit CDCs from ClassLink orgSourcedIds
  crossCampus: "cc_crossCampus",    // NEW: persists the unlock for the session
  lastCampus: "cc_lastCampus",      // NEW: remembers the cross-campus choice
};

type FieldKey = "teacher" | "campus" | "grade" | "observer" | "date" | "time" | "content";
type ScoreLevel = "u" | "p" | "m" | null;
type FormFields = { teacher: string; campus: string; grade: string; observer: string; date: string; time: string; content: string; };
type ScoreMap = { [key: string]: ScoreLevel; };
type ErrorMap = { [key: string]: boolean; };
type RubricItem = { id: string; bold: string; text: string; italic?: string; u: number; p: number; m: number; };
type TeacherInfo = { name: string; email: string; localId: string };

// ==== CSV PARSING ====
// Proper RFC-4180 parser. The old version split on every comma, so any cell
// containing a comma ("Smith, John") would shift every later column right by one.
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }   // escaped quote
        else inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (ch === "\r") { /* ignore CR in CRLF */ }
      else cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row); }

  return rows.map(r => r.map(c => c.trim())).filter(r => r.some(c => c !== ""));
}

async function fetchSheetData(sheetName: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  const text = await res.text();
  return parseCSV(text);
}

// ==== HEADER-BASED COLUMN LOOKUP ====
// Find a column by its header NAME, not its position. Columns can now be added,
// removed, or reordered in the sheet without breaking the form.
// Exact match only — "CDC" must not accidentally match "CDC (Edugence)".
function colIdx(header: string[], ...aliases: string[]): number {
  for (const alias of aliases) {
    const target = alias.trim().toLowerCase();
    const i = header.findIndex(h => (h || "").trim().toLowerCase() === target);
    if (i >= 0) return i;
  }
  return -1;
}

const cell = (row: string[], i: number) => (i >= 0 ? (row[i] || "").trim() : "");

const PLANNING: RubricItem[] = [
  { id: "p1", bold: "Teach at Grade Level:", text: "Students have a clear lesson objective. Lesson materials and activities are aligned to the objective and to state standards.", u: 0, p: 0.5, m: 1 },
  { id: "p2", bold: "Teach to the DOL:", text: "Teacher has internalized the DOL/exit ticket during planning, anticipated misconceptions and adjusted materials accordingly. Teacher intentionally threads the lesson objective throughout the lesson.", italic: "(Some examples of strong internalization include, but are not limited to, knowledge of the slides or materials, fluid delivery, anticipated misconceptions, purposeful plans for at-bats, rigorous questioning aligned to objective.)", u: 0, p: 0.5, m: 1 },
  { id: "p3", bold: "Use exemplars:", text: "Teacher plans and embeds concrete examples/exemplars of desired student responses or products to support student understanding of what success looks like.", u: 0, p: 0.5, m: 1 },
];

const INSTRUCTION: RubricItem[] = [
  { id: "i1", bold: "Get to the objective:", text: "Teacher focuses core instruction on mastery of the planned objective. Teacher gets to the objective quickly and remains focused on the objective throughout the lesson.", u: 0, p: 1, m: 2 },
  { id: "i2", bold: "Stamp key points:", text: "Teacher consistently stamps key learning points throughout the lesson – during and/or after student engagement opportunities and/or instructional transitions.", u: 0, p: 0.5, m: 1 },
  { id: "i3", bold: "Pick up the pace:", text: "Teacher moves students steadily and purposefully toward independent mastery. Transitions and routines support a learning environment that allows for maximized instructional time.", u: 0, p: 1, m: 2 },
  { id: "i4", bold: "Provide multiple opportunities:", text: "Teacher provides students with multiple opportunities/at bats to practice skills aligned to the objective.", u: 0, p: 0.5, m: 1 },
  { id: "i5", bold: "Engagement strategies (listening and speaking):", text: "All students engage in meaningful, challenging, real-world content with their peers through listening, thinking, and speaking.", u: 0, p: 0.5, m: 1 },
  { id: "i6", bold: "Engagement strategies (writing):", text: "Students engage in thinking after reading using structured writing activities aligned to the lesson objective that promote analysis, reasoning, and/or justification.", u: 0, p: 1, m: 2 },
  { id: "i7", bold: "Annotation (reading):", text: "Teacher and students read and annotate for a specific purpose, tied to the objective, to support a deeper understanding of text or problems.", u: 0, p: 0.5, m: 1 },
  { id: "i8", bold: "Scaffolds:", text: "Teacher scaffolds instruction proactively and in response to student misunderstanding as needed.", u: 0, p: 0.5, m: 1 },
  { id: "i9", bold: "Use students answers and questions:", text: "Teacher utilizes student answers and questions to reinforce key ideas and/or correct misconceptions.", u: 0, p: 0.5, m: 1 },
  { id: "i10", bold: "Monitor and adjust:", text: "Teacher monitors student progress throughout the lesson and adjusts accordingly based on collected data.", u: 0, p: 0.5, m: 1 },
];

const CULTURE: RubricItem[] = [
  { id: "c1", bold: "Learning environment:", text: "The classroom is organized, safe, and respectful to support student learning and positive interactions.", u: 0, p: 0.5, m: 1 },
  { id: "c2", bold: "Reinforce and redirect:", text: "The teacher reinforces positive behaviors and/or intercepts misbehavior without disruption to lesson momentum.", u: 0, p: 0.5, m: 1 },
];

const ALL_ITEMS = [...PLANNING, ...INSTRUCTION, ...CULTURE];
const REQUIRED_FIELDS: FieldKey[] = ["teacher", "campus", "grade", "observer", "date", "content"];

// Campuses exempted from required-field/rubric validation on submit
const OPTIONAL_VALIDATION_CAMPUSES = ["rice elementary school"];

function getProficiency(total: number) {
  if (total <= 5.5)  return { label: "UNSAT",   color: "#C0272D" };
  if (total <= 7.5)  return { label: "PROG I",  color: "#D05020" };
  if (total <= 10)   return { label: "PROG II", color: "#C08020" };
  if (total <= 14)   return { label: "PROF I",  color: "#2A7F8F" };
  if (total <= 16.5) return { label: "PROF II", color: "#1F6B7A" };
  if (total <= 17.5) return { label: "EXEMP I", color: "#1a5c30" };
  return               { label: "EXEMP II", color: "#0e3d1f" };
}

// ==== HEADER ====
function FormHeader() {
  return (
    <div style={{ background: NAVY, padding: "20px 0", textAlign: "center", color: WHITE, fontFamily: "'Arial Black', sans-serif", borderBottom: "2px solid #0F1A33" }}>
      <div style={{ fontSize: 26, fontWeight: 900 }}>2026-27 Tyler ISD Core Spot Observation Form</div>
    </div>
  );
}

// ==== SCORE ROW COMPONENT ====
function ScoreRow(props: { item: RubricItem; value: ScoreLevel; onChange: (id: string, level: ScoreLevel) => void; hasError: boolean; }) {
  const { item, value, onChange, hasError } = props;
  return (
    <tr style={{ borderBottom: "1px solid #ddd", background: hasError ? "#fff8f8" : "transparent" }}>
      <td style={{ padding: "6px 10px", fontSize: 12, lineHeight: 1.5, verticalAlign: "top", borderLeft: hasError ? `3px solid ${RED}` : "3px solid transparent" }}>
        <strong>{item.bold}</strong> {item.text}
        {item.italic && <em style={{ color: "#666", display: "block", marginTop: 2 }}>{item.italic}</em>}
      </td>
      {(["u", "p", "m"] as const).map((level) => (
        <td key={level} style={{ textAlign: "center", verticalAlign: "middle", width: 36, padding: "4px 2px" }}>
          <button
            type="button"
            onClick={() => onChange(item.id, value === level ? null : level)}
            style={{
              width: 28, height: 28, borderRadius: "50%", border: "2px solid",
              borderColor: value === level ? (level === "u" ? RED : level === "p" ? GOLD : "#2a7a3a") : "#ccc",
              background: value === level ? (level === "u" ? RED : level === "p" ? GOLD : "#2a7a3a") : WHITE,
              color: value === level ? WHITE : "#666",
              fontWeight: "bold", fontSize: 11, cursor: "pointer",
            }}
          >
            {item[level]}
          </button>
        </td>
      ))}
    </tr>
  );
}

// ==== CONFIRMATION SCREEN ====
function ConfirmationScreen({ fields, totalPoints, proficiency, onNew }: {
  fields: FormFields; totalPoints: number; proficiency: { label: string; color: string }; onNew: () => void;
}) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", background: "#f0f2f5", minHeight: "100vh", padding: "20px 0" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", background: WHITE, boxShadow: "0 4px 24px rgba(0,0,0,0.15)", borderRadius: 4, overflow: "hidden" }}>
        <FormHeader />
        <div style={{ padding: "48px 40px", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#2a7a3a", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 36, color: WHITE }}>✓</div>
          <div style={{ fontSize: 24, fontWeight: "bold", color: NAVY, marginBottom: 8 }}>Observation Submitted</div>
          <div style={{ fontSize: 14, color: "#555", marginBottom: 32 }}>Observation for <strong>{fields.teacher}</strong> has been recorded successfully.</div>
          <div style={{ background: "#f0f7f0", border: "1px solid #b8ddb8", borderRadius: 6, padding: "24px 28px", maxWidth: 500, margin: "0 auto" }}>
            <div style={{ fontSize: 15, color: "#2a5a2a", fontWeight: "bold", marginBottom: 6 }}>Would you like to submit another spot observation?</div>
            <button type="button" onClick={onNew} style={{ background: NAVY, color: WHITE, border: "none", borderRadius: 4, padding: "12px 36px", fontSize: 14, fontWeight: "bold", cursor: "pointer", letterSpacing: 0.5, marginTop: 10 }}>
              ✓ Yes, Start New Observation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==== AUTH CALLBACK ====
function AuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      window.location.href = `/api/classlink-callback?code=${code}`;
    } else {
      window.location.href = "/";
    }
  }, []);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", background: "#f0f2f5", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 8, padding: "40px 48px", boxShadow: "0 4px 24px rgba(0,0,0,0.15)", textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 15, color: "#1B2A4A", fontWeight: "bold", marginBottom: 8 }}>Signing in...</div>
        <div style={{ fontSize: 12, color: "#888" }}>Tyler ISD Core Spot Observation Form</div>
      </div>
    </div>
  );
}

// ==== SSO LANDING ====
function SSOLanding() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const observer = params.get("observer");
    const localId = params.get("localId");
    const email = params.get("email");
    // NEW: ClassLink orgSourcedIds (9-digit CDCs). Accepts a JSON array or a
    // comma/space/semicolon separated list, whichever the callback sends.
    const orgs = params.get("orgs") || params.get("orgSourcedIds");

    if (observer) sessionStorage.setItem(SS.observer, decodeURIComponent(observer));
    if (localId) sessionStorage.setItem(SS.localId, decodeURIComponent(localId));
    if (email) sessionStorage.setItem(SS.observerEmail, decodeURIComponent(email));
    if (orgs) sessionStorage.setItem(SS.orgs, decodeURIComponent(orgs));

    // A fresh sign-in starts with the cross-campus unlock OFF
    sessionStorage.removeItem(SS.crossCampus);
    sessionStorage.removeItem(SS.lastCampus);

    window.location.replace("/");
  }, []);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", background: "#f0f2f5", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 8, padding: "40px 48px", boxShadow: "0 4px 24px rgba(0,0,0,0.15)", textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 15, color: "#1B2A4A", fontWeight: "bold", marginBottom: 8 }}>Loading your profile...</div>
        <div style={{ fontSize: 12, color: "#888" }}>Tyler ISD Core Spot Observation Form</div>
      </div>
    </div>
  );
}

// Turn whatever the callback stored into a clean list of CDC strings
function readOrgCdcs(): string[] {
  const raw = (sessionStorage.getItem(SS.orgs) || "").trim();
  if (!raw) return [];

  let list: string[] = [];

  // Only attempt JSON if it actually looks like an array — otherwise a single
  // CDC ("212905117") would parse as a NUMBER and silently yield nothing.
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed.map(o => (typeof o === "string" ? o : o?.sourcedId || o?.id || ""));
      }
    } catch {
      list = [];
    }
  }

  // Normal case: a single CDC, or several separated by commas
  if (list.length === 0) list = raw.split(/[,;\s]+/);

  return Array.from(new Set(list.map(s => String(s).trim()).filter(Boolean)));
}

// ==== MAIN FORM ====
function ObservationForm() {
  const emptyFields: FormFields = { teacher: "", campus: "", grade: "", observer: "", date: "", time: "", content: "" };

  const ssoData = useRef({ observer: "", localId: "", observerEmail: "" });

  const [fields, setFields] = useState<FormFields>(emptyFields);
  const [localId, setLocalId] = useState("");
  const [observerEmail, setObserverEmail] = useState("");
  const [scores, setScores] = useState<ScoreMap>({});
  const [errors, setErrors] = useState<ErrorMap>({});
  const [attempted, setAttempted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [praise, setPraise] = useState("");
  const [polish, setPolish] = useState("");
  const [question, setQuestion] = useState("");
  const [observerLocked, setObserverLocked] = useState(false);
  const [campusTeacherMap, setCampusTeacherMap] = useState<Record<string, TeacherInfo[]>>({});
  const [allowedCampuses, setAllowedCampuses] = useState<string[]>([]);          // from ClassLink
  const [loadingData, setLoadingData] = useState(true);

  // Cross-campus unlock persists for the whole session (survives submissions AND reloads)
  const [crossCampus, setCrossCampus] = useState<boolean>(
    () => sessionStorage.getItem(SS.crossCampus) === "1"
  );

  useEffect(() => {
    // TEST HOOK — lets you exercise campus scoping before the Vercel callback
    // forwards orgs. Visit  /?orgs=212905117  or  /?orgs=212905117,212905119
    // Safe to leave in: the cross-campus checkbox already grants any campus,
    // so this isn't a security boundary. Delete these 3 lines if you'd rather.
    const orgsParam = new URLSearchParams(window.location.search).get("orgs");
    if (orgsParam) sessionStorage.setItem(SS.orgs, orgsParam);

    const observerVal = sessionStorage.getItem(SS.observer) || "";
    const localIdVal = sessionStorage.getItem(SS.localId) || "";
    const observerEmailVal = sessionStorage.getItem(SS.observerEmail) || "";
    const startedCrossCampus = sessionStorage.getItem(SS.crossCampus) === "1";

    if (observerVal) {
      setFields(prev => ({ ...prev, observer: observerVal }));
      setObserverLocked(true);
      ssoData.current.observer = observerVal;
    }
    if (localIdVal) { setLocalId(localIdVal); ssoData.current.localId = localIdVal; }
    if (observerEmailVal) { setObserverEmail(observerEmailVal); ssoData.current.observerEmail = observerEmailVal; }

    async function loadData() {
      setLoadingData(true);
      try {
        const rows = await fetchSheetData("campus_teachers");
        if (rows.length < 2) throw new Error("campus_teachers returned no data rows");

        const header = rows[0];
        const cCampus  = colIdx(header, "Campus");
        const cTeacher = colIdx(header, "Teachers", "Teacher");
        const cCdc     = colIdx(header, "CDC");                          // exact — NOT "CDC (Edugence)"
        const cId      = colIdx(header, "ID Number", "Local ID", "LocalID", "Teacher ID");
        const cEmail   = colIdx(header, "Email", "E-mail", "Email Address");

        if (cCampus < 0 || cEmail < 0 || cId < 0) {
          console.error("campus_teachers is missing an expected column. Headers seen:", header);
        }

        const map: Record<string, TeacherInfo[]> = {};
        const cdcToCampus: Record<string, string> = {};

        rows.slice(1).forEach(row => {
          const campus = cell(row, cCampus);
          if (!campus) return;

          const cdc = cell(row, cCdc);
          if (cdc) cdcToCampus[cdc] = campus;

          const teacher = cell(row, cTeacher);
          if (!teacher) return;

          if (!map[campus]) map[campus] = [];
          // Guard against duplicate names within a campus (breaks React keys + lookup)
          if (!map[campus].some(t => t.name.toLowerCase() === teacher.toLowerCase())) {
            map[campus].push({
              name: teacher,
              email: cell(row, cEmail),
              localId: cell(row, cId),
            });
          }
        });

        Object.values(map).forEach(list => list.sort((a, b) => a.name.localeCompare(b.name)));
        setCampusTeacherMap(map);

        // ---- Resolve the observer's campus(es) from ClassLink ----
        // orgSourcedIds come back as 9-digit CDCs. Anything that isn't a known
        // campus CDC (e.g. the district-level org) simply drops out.
        const orgCdcs = readOrgCdcs();
        let allowed = Array.from(
          new Set(orgCdcs.map(c => cdcToCampus[c]).filter(Boolean))
        ).sort();

        // Fallback: the manual `observers` tab, for anyone ClassLink doesn't
        // report a campus for. "District" means no restriction.
        if (allowed.length === 0 && (localIdVal || observerVal)) {
          try {
            const obsRows = await fetchSheetData("observers");
            if (obsRows.length > 1) {
              const oh = obsRows[0];
              const oId = colIdx(oh, "Local ID", "LocalID", "ID Number");
              const oName = colIdx(oh, "Name", "Observer");
              const oCampus = colIdx(oh, "Campus");
              const match = obsRows.slice(1).find(r =>
                (localIdVal && cell(r, oId) === localIdVal) ||
                (observerVal && cell(r, oName).toLowerCase() === observerVal.toLowerCase())
              );
              const c = match ? cell(match, oCampus) : "";
              if (c && c.toLowerCase() !== "district" && map[c]) allowed = [c];
            }
          } catch (e) {
            console.warn("observers tab lookup skipped:", e);
          }
        }

        setAllowedCampuses(allowed);

        // ---- Seed the campus field ----
        if (startedCrossCampus) {
          const last = sessionStorage.getItem(SS.lastCampus) || "";
          if (last && map[last]) setFields(prev => ({ ...prev, campus: last }));
        } else if (allowed.length === 1) {
          setFields(prev => ({ ...prev, campus: allowed[0] }));
        }
        // 0 campuses (district / no match) or 2+ -> leave blank, user picks
      } catch (err) {
        console.error("Error loading sheet data:", err);
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, []);

  // Derived — no state, no effect, so these can never drift out of sync
  const allCampuses = Object.keys(campusTeacherMap).sort();
  const campusLocked = !crossCampus && allowedCampuses.length === 1;
  const campusOptions =
    crossCampus || allowedCampuses.length === 0 ? allCampuses : allowedCampuses;
  const teacherList = campusTeacherMap[fields.campus] || [];
  const isCrossCampusSpot =
    allowedCampuses.length > 0 && !!fields.campus && !allowedCampuses.includes(fields.campus);

  const answeredCount = ALL_ITEMS.filter((item) => scores[item.id]).length;
  const allScored = answeredCount === ALL_ITEMS.length;
  const totalPoints = ALL_ITEMS.reduce((sum, item) => {
    const selected = scores[item.id];
    if (selected === "u") return sum + item.u;
    if (selected === "p") return sum + item.p;
    if (selected === "m") return sum + item.m;
    return sum;
  }, 0);
  const proficiency = getProficiency(totalPoints);

  function handleFieldChange(key: FieldKey, value: string) {
    setFields((prev) => {
      const next = { ...prev, [key]: value };
      // Changing campus always clears the teacher — prevents submitting a
      // teacher from the previously selected campus.
      if (key === "campus") next.teacher = "";
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: false }));
    if (key === "campus" && crossCampus) {
      sessionStorage.setItem(SS.lastCampus, value);
    }
  }

  function toggleCrossCampus(on: boolean) {
    setCrossCampus(on);
    if (on) {
      sessionStorage.setItem(SS.crossCampus, "1");
      const last = sessionStorage.getItem(SS.lastCampus) || "";
      setFields(prev => ({ ...prev, campus: last && campusTeacherMap[last] ? last : "", teacher: "" }));
    } else {
      sessionStorage.removeItem(SS.crossCampus);
      sessionStorage.removeItem(SS.lastCampus);
      setFields(prev => ({
        ...prev,
        campus: allowedCampuses.length === 1 ? allowedCampuses[0] : "",
        teacher: "",
      }));
    }
    setErrors(prev => ({ ...prev, campus: false, teacher: false }));
  }

  function handleScoreChange(id: string, level: ScoreLevel) {
    setScores((prev) => ({ ...prev, [id]: level }));
    setErrors((prev) => ({ ...prev, [id]: false }));
  }

  function handleNew() {
    // Cross-campus unlock and the chosen campus both survive the reset
    const keepCampus = crossCampus
      ? (sessionStorage.getItem(SS.lastCampus) || "")
      : (allowedCampuses.length === 1 ? allowedCampuses[0] : "");

    setFields({
      ...emptyFields,
      observer: ssoData.current.observer,
      campus: keepCampus,
    });
    setLocalId(ssoData.current.localId);
    setObserverEmail(ssoData.current.observerEmail);
    setObserverLocked(!!ssoData.current.observer);
    setScores({});
    setErrors({});
    setAttempted(false);
    setSubmitted(false);
    setIsSubmitting(false);
    setPraise("");
    setPolish("");
    setQuestion("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    setAttempted(true);

    const isExemptCampus = OPTIONAL_VALIDATION_CAMPUSES.includes(fields.campus.trim().toLowerCase());

    const newErrors: ErrorMap = {};
    let bad = false;

    if (!isExemptCampus) {
      REQUIRED_FIELDS.forEach((key) => {
        if (!fields[key].trim()) { newErrors[key] = true; bad = true; }
      });
      ALL_ITEMS.forEach((item) => {
        if (!scores[item.id]) { newErrors[item.id] = true; bad = true; }
      });
    }

    setErrors(newErrors);
    if (bad) return;

    const scoreValues: Record<string, number | string> = {};
    ALL_ITEMS.forEach(item => {
      const selected = scores[item.id];
      scoreValues[item.id] = selected ? item[selected] : "";
    });

    // FIXED: these now come from the Email and ID Number columns, looked up by
    // header name. Previously they were hard-coded to positions 2 and 3, which
    // were the campus number and the 9-digit CDC.
    const selectedTeacherInfo = teacherList.find(t => t.name === fields.teacher);

    const payload = {
      ...fields,
      localId,
      observerEmail,
      teacherEmail: selectedTeacherInfo?.email || "",
      teacherLocalId: selectedTeacherInfo?.localId || "",
      ...scoreValues,
      totalPoints,
      proficiencyLevel: getProficiency(totalPoints).label,
      praise,
      polish,
      question,
      submittedAt: new Date().toISOString(),
    };

    try {
      setIsSubmitting(true);
      await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      setSubmitted(true);
    } catch (error) {
      console.error(error);
      alert("Error submitting form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted)
    return <ConfirmationScreen fields={fields} totalPoints={totalPoints} proficiency={proficiency} onNew={handleNew} />;

  function inputStyle(key: string) {
    return {
      border: `1px solid ${errors[key] ? RED : "#ccc"}`,
      borderRadius: 3,
      padding: "6px 8px",
      fontSize: 12,
      width: "100%",
      background: errors[key] ? "#fff5f5" : WHITE,
      color: "#000000",
      colorScheme: "light" as const,
    };
  }

  function lockedStyle(key: string) {
    return { ...inputStyle(key), background: "#f3f4f6", cursor: "not-allowed" };
  }

  const PROFICIENCY_BANDS = [
    { range: "0 - 5.5",   label: "UNSAT" },
    { range: "6 - 7.5",   label: "PROG I" },
    { range: "8 - 10",    label: "PROG II" },
    { range: "10.5 - 14", label: "PROF I" },
    { range: "14.5 - 16.5", label: "PROF II" },
    { range: "17 - 17.5", label: "EXEMP I" },
    { range: "18",        label: "EXEMP II" },
  ];

  return (
    <div style={{ fontFamily: "Arial, sans-serif", background: "#f0f2f5", minHeight: "100vh", padding: "20px 0" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", background: WHITE, boxShadow: "0 4px 24px rgba(0,0,0,0.15)", borderRadius: 4, overflow: "hidden" }}>
        <FormHeader />
        <div style={{ padding: 20 }}>

          {loadingData && (
            <div style={{ textAlign: "center", padding: "12px 0", fontSize: 12, color: "#888", marginBottom: 12 }}>
              Loading observer data...
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 24 }}>

            {/* Row 1: Campus | Observer */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <label style={{ fontWeight: "bold", fontSize: 12 }}>Campus *</label>
                {campusLocked ? (
                  <input type="text" value={fields.campus} readOnly style={lockedStyle("campus")} />
                ) : (
                  <select
                    value={fields.campus}
                    onChange={(e) => handleFieldChange("campus", e.target.value)}
                    style={inputStyle("campus")}
                  >
                    <option value="">Select campus...</option>
                    {campusOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}

                {/* Cross-campus unlock — only shown to observers who actually have
                    a home campus assigned. Stays on for the rest of the session. */}
                {allowedCampuses.length > 0 && (
                  <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 11, color: "#555", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={crossCampus}
                      onChange={(e) => toggleCrossCampus(e.target.checked)}
                      style={{ cursor: "pointer" }}
                    />
                    Cross-campus collaboration — observing at another campus
                  </label>
                )}

                {isCrossCampusSpot && (
                  <div style={{ marginTop: 4, fontSize: 11, color: TEAL, fontWeight: "bold" }}>
                    Cross-campus spot — home campus: {allowedCampuses.join("; ")}
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontWeight: "bold", fontSize: 12 }}>Observer *</label>
                <input
                  type="text"
                  value={fields.observer}
                  onChange={(e) => handleFieldChange("observer", e.target.value)}
                  style={observerLocked ? lockedStyle("observer") : inputStyle("observer")}
                  readOnly={observerLocked}
                />
              </div>
            </div>

            {/* Row 2: Teacher | Grade | Content */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.6fr 1fr", gap: 24 }}>
              <div>
                <label style={{ fontWeight: "bold", fontSize: 12 }}>Teacher *</label>
                {!fields.campus ? (
                  // Hard-locked until a campus is chosen — not typeable
                  <select disabled value="" style={lockedStyle("teacher")}>
                    <option value="">Select a campus first</option>
                  </select>
                ) : teacherList.length > 0 ? (
                  <select
                    value={fields.teacher}
                    onChange={(e) => handleFieldChange("teacher", e.target.value)}
                    style={inputStyle("teacher")}
                  >
                    <option value="">Select teacher...</option>
                    {teacherList.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                  </select>
                ) : (
                  // Campus chosen but no roster rows — allow manual entry rather than dead-ending
                  <input
                    type="text"
                    value={fields.teacher}
                    onChange={(e) => handleFieldChange("teacher", e.target.value)}
                    placeholder="No teachers found for this campus"
                    style={inputStyle("teacher")}
                  />
                )}
              </div>

              <div>
                <label style={{ fontWeight: "bold", fontSize: 12 }}>Grade *</label>
                <select value={fields.grade} onChange={(e) => handleFieldChange("grade", e.target.value)} style={inputStyle("grade")}>
                  <option value="">Select grade...</option>
                  <option>3rd</option><option>4th</option><option>5th</option>
                  <option>6th</option><option>7th</option><option>8th</option>
                </select>
              </div>

              <div>
                <label style={{ fontWeight: "bold", fontSize: 12 }}>Content *</label>
                <select value={fields.content} onChange={(e) => handleFieldChange("content", e.target.value)} style={inputStyle("content")}>
                  <option value="">Select content...</option>
                  <option>Math</option><option>Reading</option>
                  <option>Science</option><option>Social Studies</option>
                </select>
              </div>
            </div>

            {/* Row 3: Date | Time */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
              <div>
                <label style={{ fontWeight: "bold", fontSize: 12 }}>Date *</label>
                <input type="date" value={fields.date} onChange={(e) => handleFieldChange("date", e.target.value)} style={inputStyle("date")} />
              </div>
              <div>
                <label style={{ fontWeight: "bold", fontSize: 12 }}>Time</label>
                <input type="time" value={fields.time} onChange={(e) => handleFieldChange("time", e.target.value)} style={inputStyle("time")} />
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 6, background: "#e0e0e0", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${(answeredCount / ALL_ITEMS.length) * 100}%`, height: "100%", background: allScored ? "#2a7a3a" : TEAL, borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 11, color: allScored ? "#2a7a3a" : "#666", fontWeight: "bold" }}>
              {allScored ? "✓ All indicators scored" : `${answeredCount} of ${ALL_ITEMS.length} indicators scored`}
            </div>
          </div>

          {/* Rubric table */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 0 }}>
            <tbody>
              <tr style={{ background: "#e8eef5" }}>
                <td style={{ padding: "5px 10px", fontSize: 11, fontWeight: "bold", color: "#333" }}>
                  Click the number of points earned (U = Unsatisfactory, P = Partially Effective, and M = Mostly Effective)
                </td>
                <td style={{ textAlign: "center", fontWeight: "bold" }}>U</td>
                <td style={{ textAlign: "center", fontWeight: "bold" }}>P</td>
                <td style={{ textAlign: "center", fontWeight: "bold" }}>M</td>
              </tr>
              <tr><td colSpan={4} style={{ background: NAVY, color: WHITE, textAlign: "center", padding: 8 }}>PLANNING</td></tr>
              {PLANNING.map((item) => <ScoreRow key={item.id} item={item} value={scores[item.id] || null} onChange={handleScoreChange} hasError={!!errors[item.id]} />)}
              <tr><td colSpan={4} style={{ background: NAVY, color: WHITE, textAlign: "center", padding: 8 }}>INSTRUCTION</td></tr>
              {INSTRUCTION.map((item) => <ScoreRow key={item.id} item={item} value={scores[item.id] || null} onChange={handleScoreChange} hasError={!!errors[item.id]} />)}
              <tr><td colSpan={4} style={{ background: NAVY, color: WHITE, textAlign: "center", padding: 8 }}>CLASSROOM CULTURE</td></tr>
              {CULTURE.map((item) => <ScoreRow key={item.id} item={item} value={scores[item.id] || null} onChange={handleScoreChange} hasError={!!errors[item.id]} />)}

              {/* Total Points row */}
              <tr style={{ borderTop: "2px solid #ccc" }}>
                <td colSpan={3} style={{ padding: "8px 10px", fontSize: 13, fontWeight: "bold", textAlign: "right" }}>
                  Total Points:
                </td>
                <td style={{ textAlign: "center", padding: "8px 4px" }}>
                  <div style={{
                    background: answeredCount > 0 ? GOLD : "#f0f0f0",
                    color: answeredCount > 0 ? "#000" : "#999",
                    fontWeight: "bold",
                    fontSize: 14,
                    borderRadius: 3,
                    padding: "4px 8px",
                    minWidth: 36,
                    display: "inline-block",
                  }}>
                    {answeredCount > 0 ? totalPoints : "—"}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Proficiency Level table */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 4, border: "1px solid #ccc" }}>
            <tbody>
              <tr>
                <td colSpan={7} style={{ background: GOLD, color: "#000", textAlign: "center", padding: "6px 10px", fontWeight: "bold", fontSize: 13 }}>
                  Proficiency Level
                </td>
              </tr>
              <tr>
                {PROFICIENCY_BANDS.map((band) => (
                  <td key={band.label} style={{
                    textAlign: "center",
                    padding: "4px 2px",
                    fontSize: 11,
                    border: "1px solid #ccc",
                    background: answeredCount > 0 && proficiency.label === band.label ? proficiency.color : "transparent",
                    color: answeredCount > 0 && proficiency.label === band.label ? WHITE : "#333",
                    fontWeight: answeredCount > 0 && proficiency.label === band.label ? "bold" : "normal",
                  }}>
                    {band.range}
                  </td>
                ))}
              </tr>
              <tr>
                {PROFICIENCY_BANDS.map((band) => (
                  <td key={band.label} style={{
                    textAlign: "center",
                    padding: "4px 2px",
                    fontSize: 11,
                    border: "1px solid #ccc",
                    background: answeredCount > 0 && proficiency.label === band.label ? proficiency.color : "transparent",
                    color: answeredCount > 0 && proficiency.label === band.label ? WHITE : "#333",
                    fontWeight: answeredCount > 0 && proficiency.label === band.label ? "bold" : "normal",
                  }}>
                    {band.label}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>

          {/* Rounding note */}
          <div style={{ textAlign: "center", color: RED, fontSize: 12, fontStyle: "italic", marginBottom: 20, marginTop: 2 }}>
            Note: Spot scores are NOT rounded
          </div>

          {/* Praise / Polish / Question */}
          {([["Praise", praise, setPraise], ["Polish", polish, setPolish], ["Question", question, setQuestion]] as [string, string, React.Dispatch<React.SetStateAction<string>>][]).map(([label, val, setter]) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <label>{label}</label>
              <textarea value={val} onChange={(e) => setter(e.target.value)} rows={2}
                style={{ width: "100%", border: "1px solid #ccc", borderRadius: 3, padding: "6px 8px", fontSize: 12 }} />
            </div>
          ))}

          {attempted && Object.values(errors).some(Boolean) && (
            <div style={{ background: "#fff5f5", border: `1px solid ${RED}`, padding: 12, borderRadius: 4, color: RED, fontSize: 12, marginBottom: 16 }}>
              ⚠ Please complete all required fields and score all indicators before submitting.
            </div>
          )}

          <div style={{ textAlign: "center" }}>
            <button type="button" onClick={handleSubmit} disabled={isSubmitting}
              style={{ background: isSubmitting ? "#7a869a" : NAVY, color: WHITE, border: "none", borderRadius: 4, padding: "13px 52px", fontWeight: "bold", cursor: isSubmitting ? "not-allowed" : "pointer" }}>
              {isSubmitting ? "Submitting..." : "Submit Observation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const path = window.location.pathname;
  if (path === "/auth/callback") return <AuthCallback />;
  if (path === "/sso-landing") return <SSOLanding />;
  return <ObservationForm />;
}