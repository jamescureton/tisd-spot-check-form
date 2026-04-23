import { useState, useEffect } from "react";

const SCRIPT_URL =
  "[script.google.com](https://script.google.com/macros/s/AKfycbzun92OtVuFcWlTd2pNDHT8MVlGscRiC39BXIeuM33sN6x0Viwal61WbgzQK4BbF0fZ/exec)";

const NAVY = "#1B2A4A";
const RED = "#C0272D";
const GOLD = "#C9982A";
const TEAL = "#2A7F8F";
const WHITE = "#FFFFFF";

type FieldKey = "teacher" | "campus" | "grade" | "observer" | "date" | "time" | "content";
type ScoreLevel = "u" | "p" | "m" | null;
type FormFields = { teacher: string; campus: string; grade: string; observer: string; date: string; time: string; content: string; };
type ScoreMap = { [key: string]: ScoreLevel; };
type ErrorMap = { [key: string]: boolean; };
type RubricItem = { id: string; bold: string; text: string; italic?: string; u: number; p: number; m: number; };

function getItemPoint(itemId: string, scores: ScoreMap) {
  const item = ALL_ITEMS.find((x) => x.id === itemId);
  const selected = scores[itemId];
  if (!item || !selected) return "";
  return item[selected];
}

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
    <div
      style={{
        background: NAVY,
        padding: "20px 0",
        textAlign: "center",
        color: WHITE,
        fontFamily: "'Arial Black', sans-serif",
        borderBottom: "2px solid #0F1A33",
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 900 }}>
        2026-27 Tyler ISD Core Spot Observation Form
      </div>
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
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "2px solid",
              borderColor: value === level ? (level === "u" ? RED : level === "p" ? GOLD : "#2a7a3a") : "#ccc",
              background: value === level ? (level === "u" ? RED : level === "p" ? GOLD : "#2a7a3a") : WHITE,
              color: value === level ? WHITE : "#666",
              fontWeight: "bold",
              fontSize: 11,
              cursor: "pointer",
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
function ConfirmationScreen({ fields, totalPoints, proficiency, onNew }: { fields: FormFields; totalPoints: number; proficiency: { label: string; color: string }; onNew: () => void; }) {
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
            <button
              type="button"
              onClick={onNew}
              style={{ background: NAVY, color: WHITE, border: "none", borderRadius: 4, padding: "12px 36px", fontSize: 14, fontWeight: "bold", cursor: "pointer", letterSpacing: 0.5, marginTop: 10 }}
            >
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
    <div style={{ fontFamily: "Arial, sans-serif", background: "#f0f2f5", minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 8, padding: "40px 48px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.15)", textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 15, color: "#1B2A4A", fontWeight: "bold", marginBottom: 8 }}>
          Signing in...
        </div>
        <div style={{ fontSize: 12, color: "#888" }}>Tyler ISD Core Spot Observation Form</div>
      </div>
    </div>
  );
}

// ==== MAIN FORM ====
function ObservationForm() {
  const emptyFields: FormFields = { teacher: "", campus: "", grade: "", observer: "", date: "", time: "", content: "" };
  const [fields, setFields] = useState<FormFields>(emptyFields);
  const [scores, setScores] = useState<ScoreMap>({});
  const [errors, setErrors] = useState<ErrorMap>({});
  const [attempted, setAttempted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [praise, setPraise] = useState("");
  const [polish, setPolish] = useState("");
  const [question, setQuestion] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const observer = params.get("observer");
    const campus = params.get("campus");
    if (observer) setFields(prev => ({ ...prev, observer: decodeURIComponent(observer) }));
    if (campus) setFields(prev => ({ ...prev, campus: decodeURIComponent(campus) }));
  }, []);
  
  const answeredCount = ALL_ITEMS.filter((item) => scores[item.id]).length;

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
    setFields((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: false }));
  }

  function handleScoreChange(id: string, level: ScoreLevel) {
    setScores((prev) => ({ ...prev, [id]: level }));
    setErrors((prev) => ({ ...prev, [id]: false }));
  }

  function handleNew() {
    setFields(emptyFields);
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
    const newErrors: ErrorMap = {};
    let bad = false;
    REQUIRED_FIELDS.forEach((key) => {
      if (!fields[key].trim()) {
        newErrors[key] = true;
        bad = true;
      }
    });
    ALL_ITEMS.forEach((item) => {
      if (!scores[item.id]) {
        newErrors[item.id] = true;
        bad = true;
      }
    });
    setErrors(newErrors);
    if (bad) return;

    const payload = {
      ...fields,
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
    return (
      <ConfirmationScreen
        fields={fields}
        totalPoints={totalPoints}
        proficiency={proficiency}
        onNew={handleNew}
      />
    );

  function inputStyle(key: string) {
    return {
      border: `1px solid ${errors[key] ? RED : "#ccc"}`,
      borderRadius: 3,
      padding: "6px 8px",
      fontSize: 12,
      width: "100%",
      background: errors[key] ? "#fff5f5" : WHITE,
    };
  }

  return (
    <div style={{ fontFamily: "Arial, sans-serif", background: "#f0f2f5", minHeight: "100vh", padding: "20px 0" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", background: WHITE, boxShadow: "0 4px 24px rgba(0,0,0,0.15)", borderRadius: 4, overflow: "hidden" }}>
        <FormHeader />
        <div style={{ padding: 20 }}>
{/* ===== FORM FIELDS ===== */}
<div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 24 }}>

  {/* Row 1: Campus | Observer */}
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
    <div>
      <label style={{ fontWeight: "bold", fontSize: 12 }}>Campus *</label>
      <select
        value={fields.campus}
        onChange={(e) => handleFieldChange("campus", e.target.value)}
        style={inputStyle("campus")}
      >
        <option value="">Select campus...</option>
        <option>Austin Elementary School</option>
        <option>Boulter Middle School</option>
        <option>Clarkston Elementary School</option>
        <option>Dixie Elementary School</option>
        <option>Douglas Elementary School</option>
        <option>Griffin Elementary School</option>
        <option>Jones Elementary School</option>
        <option>Orr Elementary School</option>
        <option>Peete Elementary School</option>
        <option>Ramey Elementary School</option>
      </select>
    </div>

    <div>
      <label style={{ fontWeight: "bold", fontSize: 12 }}>Observer *</label>
      <input
        type="text"
        value={fields.observer}
        onChange={(e) => handleFieldChange("observer", e.target.value)}
        style={inputStyle("observer")}
      />
    </div>
  </div>

  {/* Row 2: Teacher | Grade | Content */}
  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.6fr 1fr", gap: 24 }}>
    <div>
      <label style={{ fontWeight: "bold", fontSize: 12 }}>Teacher *</label>
      <input
        type="text"
        value={fields.teacher}
        onChange={(e) => handleFieldChange("teacher", e.target.value)}
        style={inputStyle("teacher")}
      />
    </div>

    <div>
      <label style={{ fontWeight: "bold", fontSize: 12 }}>Grade *</label>
      <select
        value={fields.grade}
        onChange={(e) => handleFieldChange("grade", e.target.value)}
        style={inputStyle("grade")}
      >
        <option value="">Select grade...</option>
        <option>3rd</option>
        <option>4th</option>
        <option>5th</option>
        <option>6th</option>
        <option>7th</option>
        <option>8th</option>
      </select>
    </div>

    <div>
      <label style={{ fontWeight: "bold", fontSize: 12 }}>Content *</label>
      <select
        value={fields.content}
        onChange={(e) => handleFieldChange("content", e.target.value)}
        style={inputStyle("content")}
      >
        <option value="">Select content...</option>
        <option>Math</option>
        <option>Reading</option>
        <option>Science</option>
        <option>Social Studies</option>
      </select>
    </div>
  </div>

  {/* Row 3: Date | Time */}
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
    <div>
      <label style={{ fontWeight: "bold", fontSize: 12 }}>Date *</label>
      <input
        type="date"
        value={fields.date}
        onChange={(e) => handleFieldChange("date", e.target.value)}
        style={inputStyle("date")}
      />
    </div>

    <div>
      <label style={{ fontWeight: "bold", fontSize: 12 }}>Time</label>
      <input
        type="time"
        value={fields.time}
        onChange={(e) => handleFieldChange("time", e.target.value)}
        style={inputStyle("time")}
      />
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
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
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
            </tbody>
          </table>

          {/* Praise / Polish / Question */}
          {([["Praise", praise, setPraise], ["Polish", polish, setPolish], ["Question", question, setQuestion]] as [string, string, React.Dispatch<React.SetStateAction<string>>][]).map(([label, val, setter]) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <label>{label}</label>
              <textarea
                value={val}
                onChange={(e) => setter(e.target.value)}
                rows={2}
                style={{ width: "100%", border: "1px solid #ccc", borderRadius: 3, padding: "6px 8px", fontSize: 12 }}
              />
            </div>
          ))}

          {attempted && Object.values(errors).some(Boolean) && (
            <div style={{ background: "#fff5f5", border: `1px solid ${RED}`, padding: 12, borderRadius: 4, color: RED, fontSize: 12, marginBottom: 16 }}>
              ⚠ Please complete all required fields and score all indicators before submitting.
            </div>
          )}

          <div style={{ textAlign: "center" }}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                background: isSubmitting ? "#7a869a" : NAVY,
                color: WHITE,
                border: "none",
                borderRadius: 4,
                padding: "13px 52px",
                fontWeight: "bold",
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              {isSubmitting ? "Submitting..." : "Submit Observation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const isCallback = window.location.pathname === "/auth/callback";
  if (isCallback) return <AuthCallback />;
  return <ObservationForm />;
}
