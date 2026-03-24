import { useState } from "react";

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzun92OtVuFcWlTd2pNDHT8MVlGscRiC39BXIeuM33sN6x0Viwal61WbgzQK4BbF0fZ/exec";


  function getItemPoint(itemId: string, scores: ScoreMap) {
    const item = ALL_ITEMS.find((x) => x.id === itemId);
    const selected = scores[itemId];
    if (!item || !selected) return "";
    return item[selected];
  }

const NAVY = "#1B2A4A";
const RED = "#C0272D";
const GOLD = "#C9982A";
const TEAL = "#2A7F8F";
const WHITE = "#FFFFFF";

const CAMPUS_OPTIONS = [
  "Select campus...",
  "Austin",
  "Clarkston",
  "Dixie",
  "Douglas",
  "Griffin",
  "Jones",
  "Orr",
  "Peete",
  "Ramey",
  "Boulter"
];

const GRADE_OPTIONS = [
  "Select grade...",
  "PK",
  "K",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8"
];

const CONTENT_OPTIONS = [
  "Select content...",
  "Reading",
  "Math",
  "Science",
  "Social Studies",
];

type FieldKey =
  | "teacher"
  | "campus"
  | "grade"
  | "observer"
  | "date"
  | "time"
  | "content";

type ScoreLevel = "u" | "p" | "m" | null;

type FormFields = {
  teacher: string;
  campus: string;
  grade: string;
  observer: string;
  date: string;
  time: string;
  content: string;
};

type ScoreMap = {
  [key: string]: ScoreLevel;
};

type ErrorMap = {
  [key: string]: boolean;
};

type RubricItem = {
  id: string;
  bold: string;
  text: string;
  italic?: string;
  u: number;
  p: number;
  m: number;
};

const PLANNING: RubricItem[] = [
  {
    id: "p1",
    bold: "Teach at Grade Level:",
    text: "Students have a clear lesson objective. Lesson materials and activities are aligned to the objective and to state standards.",
    u: 0,
    p: 0.5,
    m: 1,
  },
  {
    id: "p2",
    bold: "Teach to the DOL:",
    text: "Teacher has internalized the DOL/exit ticket during planning, anticipated misconceptions and adjusted materials accordingly. Teacher intentionally threads the lesson objective throughout the lesson.",
    italic:
      "(Some examples of strong internalization include, but are not limited to, knowledge of the slides or materials, fluid delivery, anticipated misconceptions, purposeful plans for at-bats, rigorous questioning aligned to objective.)",
    u: 0,
    p: 0.5,
    m: 1,
  },
  {
    id: "p3",
    bold: "Use exemplars:",
    text: "Teacher plans and embeds concrete examples/exemplars of desired student responses or products to support student understanding of what success looks like.",
    u: 0,
    p: 0.5,
    m: 1,
  },
];

const INSTRUCTION: RubricItem[] = [
  {
    id: "i1",
    bold: "Get to the objective:",
    text: "Teacher focuses core instruction on mastery of the planned objective. Teacher gets to the objective quickly and remains focused on the objective throughout the lesson.",
    u: 0,
    p: 1,
    m: 2,
  },
  {
    id: "i2",
    bold: "Stamp key points:",
    text: "Teacher consistently stamps key learning points throughout the lesson – during and/or after student engagement opportunities and/or instructional transitions.",
    u: 0,
    p: 0.5,
    m: 1,
  },
  {
    id: "i3",
    bold: "Pick up the pace:",
    text: "Teacher moves students steadily and purposefully toward independent mastery. Transitions and routines support a learning environment that allows for maximized instructional time.",
    u: 0,
    p: 1,
    m: 2,
  },
  {
    id: "i4",
    bold: "Provide multiple opportunities:",
    text: "Teacher provides student with multiple opportunities/at bats to practice skills aligned to the objective.",
    u: 0,
    p: 0.5,
    m: 1,
  },
  {
    id: "i5",
    bold: "Engagement strategies (listening and speaking):",
    text: "All students engage in meaningful, challenging, real-world content with their peers through listening, thinking, and speaking.",
    u: 0,
    p: 0.5,
    m: 1,
  },
  {
    id: "i6",
    bold: "Engagement strategies (writing):",
    text: "Students engage in thinking after reading using structured writing activities aligned to the lesson objective that promote analysis, reasoning, and/or justification.",
    u: 0,
    p: 1,
    m: 2,
  },
  {
    id: "i7",
    bold: "Annotation (reading):",
    text: "Teacher and students read and annotate for a specific purpose, tied to the objective, to support a deeper understanding of text or problems.",
    u: 0,
    p: 0.5,
    m: 1,
  },
  {
    id: "i8",
    bold: "Scaffolds:",
    text: "Teacher scaffolds instruction proactively and in response to student misunderstanding as needed.",
    u: 0,
    p: 0.5,
    m: 1,
  },
  {
    id: "i9",
    bold: "Use students answers and questions:",
    text: "Teacher utilizes student answers and questions to reinforce key ideas and/or correct misconceptions.",
    u: 0,
    p: 0.5,
    m: 1,
  },
  {
    id: "i10",
    bold: "Monitor and adjust:",
    text: "Teacher monitors student progress throughout the lesson and adjusts accordingly based on collected data.",
    u: 0,
    p: 0.5,
    m: 1,
  },
];

const CULTURE: RubricItem[] = [
  {
    id: "c1",
    bold: "Learning environment:",
    text: "The classroom is organized, safe, and respectful to support student learning and positive interactions.",
    u: 0,
    p: 0.5,
    m: 1,
  },
  {
    id: "c2",
    bold: "Reinforce and redirect:",
    text: "The teacher reinforces positive behaviors and/or intercepts misbehavior without disruption to lesson momentum.",
    u: 0,
    p: 0.5,
    m: 1,
  },
];

const ALL_ITEMS = [...PLANNING, ...INSTRUCTION, ...CULTURE];
const REQUIRED_FIELDS: FieldKey[] = [
  "teacher",
  "campus",
  "grade",
  "observer",
  "date",
  "content",
];

function getProficiency(total: number) {
  if (total <= 5.5) return { label: "UNSAT", color: "#C0272D" };
  if (total <= 7.5) return { label: "PROG I", color: "#D05020" };
  if (total <= 10) return { label: "PROG II", color: "#C08020" };
  if (total <= 14) return { label: "PROF I", color: "#2A7F8F" };
  if (total <= 16.5) return { label: "PROF II", color: "#1F6B7A" };
  if (total <= 17.5) return { label: "EXEMP I", color: "#1a5c30" };
  return { label: "EXEMP II", color: "#0e3d1f" };
}

function ScoreRow(props: {
  item: RubricItem;
  value: ScoreLevel;
  onChange: (id: string, level: ScoreLevel) => void;
  hasError: boolean;
}) {
  const { item, value, onChange, hasError } = props;

  return (
    <tr
      style={{
        borderBottom: "1px solid #ddd",
        background: hasError ? "#fff8f8" : "transparent",
      }}
    >
      <td
        style={{
          padding: "6px 10px",
          fontSize: 12,
          lineHeight: 1.5,
          verticalAlign: "top",
          borderLeft: hasError ? `3px solid ${RED}` : "3px solid transparent",
        }}
      >
        <strong>{item.bold}</strong> {item.text}
        {item.italic && (
          <em style={{ color: "#666", display: "block", marginTop: 2 }}>
            {item.italic}
          </em>
        )}
      </td>

      {(["u", "p", "m"] as const).map((level) => (
        <td
          key={level}
          style={{
            textAlign: "center",
            verticalAlign: "middle",
            width: 36,
            padding: "4px 2px",
          }}
        >
          <button
            type="button"
            onClick={() => onChange(item.id, value === level ? null : level)}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "2px solid",
              borderColor:
                value === level
                  ? level === "u"
                    ? RED
                    : level === "p"
                    ? GOLD
                    : "#2a7a3a"
                  : "#ccc",
              background:
                value === level
                  ? level === "u"
                    ? RED
                    : level === "p"
                    ? GOLD
                    : "#2a7a3a"
                  : WHITE,
              color: value === level ? WHITE : "#666",
              fontWeight: "bold",
              fontSize: 11,
              cursor: "pointer",
              margin: "0 auto",
            }}
          >
            {item[level]}
          </button>
        </td>
      ))}
    </tr>
  );
}

function App() {
  const emptyFields: FormFields = {
    teacher: "",
    campus: "",
    grade: "",
    observer: "",
    date: "",
    time: "",
    content: "",
  };

  const [fields, setFields] = useState<FormFields>(emptyFields);
  const [scores, setScores] = useState<ScoreMap>({});
  const [errors, setErrors] = useState<ErrorMap>({});
  const [attempted, setAttempted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [praise, setPraise] = useState("");
  const [polish, setPolish] = useState("");
  const [question, setQuestion] = useState("");

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
  scores,
  p1: getItemPoint("p1", scores),
  p2: getItemPoint("p2", scores),
  p3: getItemPoint("p3", scores),
  i1: getItemPoint("i1", scores),
  i2: getItemPoint("i2", scores),
  i3: getItemPoint("i3", scores),
  i4: getItemPoint("i4", scores),
  i5: getItemPoint("i5", scores),
  i6: getItemPoint("i6", scores),
  i7: getItemPoint("i7", scores),
  i8: getItemPoint("i8", scores),
  i9: getItemPoint("i9", scores),
  i10: getItemPoint("i10", scores),
  c1: getItemPoint("c1", scores),
  c2: getItemPoint("c2", scores),
  totalPoints,
  proficiencyLevel: getProficiency(totalPoints).label,
  praise,
  polish,
  question,
  submittedAt: new Date().toISOString(),
};

    try {
      setIsSubmitting(true);

      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      const result = JSON.parse(text);

      if (result.result === "success") {
        setSubmitted(true);
      } else {
        alert(result.message || "Submission failed.");
      }
    } catch (error) {
      console.error(error);
      alert("Error submitting form.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ padding: 40, fontFamily: "Arial, sans-serif" }}>
        <h2>Observation Submitted</h2>
        <p>
          Observation for <strong>{fields.teacher}</strong> was submitted.
        </p>
      </div>
    );
  }

  function inputStyle(key: string) {
    return {
      border: `1px solid ${errors[key] ? RED : "#ccc"}`,
      borderRadius: 3,
      padding: "6px 8px",
      fontSize: 12,
      width: "100%",
      boxSizing: "border-box" as const,
      background: errors[key] ? "#fff5f5" : WHITE,
    };
  }

  function selectStyle(key: string) {
    return {
      ...inputStyle(key),
      height: 32,
      background: errors[key] ? "#fff5f5" : WHITE,
    };
  }

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        background: "#f0f2f5",
        minHeight: "100vh",
        padding: "20px 0",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          background: WHITE,
          boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: NAVY,
            color: WHITE,
            padding: "18px 24px",
            fontSize: 22,
            fontWeight: "bold",
          }}
        >
          2026-27 Tyler ISD Core Spot Observation Form
        </div>

        <div style={{ padding: 20 }}>
        <div style={{ marginBottom: 20 }}>
  {/* Row 1: Campus + Observer */}
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "110px 1fr 110px 1fr",
      gap: 12,
      alignItems: "center",
      marginBottom: 10,
    }}
  >
    <div style={{ fontSize: 12, fontWeight: "bold" }}>Campus</div>
    <div>
      <select
        value={fields.campus}
        onChange={(e) => handleFieldChange("campus", e.target.value)}
        style={selectStyle("campus")}
      >
        {CAMPUS_OPTIONS.map((option) => (
          <option
            key={option}
            value={option === "Select campus..." ? "" : option}
          >
            {option}
          </option>
        ))}
      </select>
    </div>

    <div style={{ fontSize: 12, fontWeight: "bold" }}>Observer</div>
    <div>
      <input
        value={fields.observer}
        onChange={(e) => handleFieldChange("observer", e.target.value)}
        style={inputStyle("observer")}
      />
    </div>
  </div>

  {/* Row 2: Teacher + Grade + Content */}
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "110px 1fr 110px 1fr 110px 1fr",
      gap: 12,
      alignItems: "center",
      marginBottom: 10,
    }}
  >
    <div style={{ fontSize: 12, fontWeight: "bold" }}>Teacher</div>
    <div>
      <input
        value={fields.teacher}
        onChange={(e) => handleFieldChange("teacher", e.target.value)}
        style={inputStyle("teacher")}
      />
    </div>

    <div style={{ fontSize: 12, fontWeight: "bold" }}>Grade</div>
    <div>
      <select
        value={fields.grade}
        onChange={(e) => handleFieldChange("grade", e.target.value)}
        style={selectStyle("grade")}
      >
        {GRADE_OPTIONS.map((option) => (
          <option
            key={option}
            value={option === "Select grade..." ? "" : option}
          >
            {option}
          </option>
        ))}
      </select>
    </div>

    <div style={{ fontSize: 12, fontWeight: "bold" }}>Content</div>
    <div>
      <select
        value={fields.content}
        onChange={(e) => handleFieldChange("content", e.target.value)}
        style={selectStyle("content")}
      >
        {CONTENT_OPTIONS.map((option) => (
          <option
            key={option}
            value={option === "Select content..." ? "" : option}
          >
            {option}
          </option>
        ))}
      </select>
    </div>
  </div>

  {/* Row 3: Date + Time */}
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "110px 1fr 110px 1fr",
      gap: 12,
      alignItems: "center",
    }}
  >
    <div style={{ fontSize: 12, fontWeight: "bold" }}>Date</div>
    <div>
      <input
        type="date"
        value={fields.date}
        onChange={(e) => handleFieldChange("date", e.target.value)}
        style={inputStyle("date")}
      />
    </div>

    <div style={{ fontSize: 12, fontWeight: "bold" }}>Time</div>
    <div>
      <input
        type="time"
        value={fields.time}
        onChange={(e) => handleFieldChange("time", e.target.value)}
        style={inputStyle("time")}
      />
    </div>
  </div>
</div>

          <div
            style={{
              marginBottom: 12,
              fontSize: 12,
              color: allScored ? "#2a7a3a" : "#666",
              fontWeight: "bold",
            }}
          >
            {answeredCount} of {ALL_ITEMS.length} indicators scored
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: 20,
            }}
          >
            <tbody>
            <tr style={{ background: "#e8eef5" }}>
  <td style={{ padding: 8, fontWeight: "bold", fontSize: 11, }}>
    Click the number of points earned (U = Unsatisfactory, P = Partially Effective, and M = Mostly Effective)
  </td>
  <td style={{ textAlign: "center", fontWeight: "bold" }}></td>
  <td style={{ textAlign: "center", fontWeight: "bold" }}></td>
  <td style={{ textAlign: "center", fontWeight: "bold" }}></td>
</tr>

<tr style={{ background: NAVY, color: WHITE }}>
  <td style={{ padding: 8, fontWeight: "bold" }}>PLANNING</td>
  <td style={{ textAlign: "center", fontWeight: "bold", padding: 8 }}>U</td>
  <td style={{ textAlign: "center", fontWeight: "bold", padding: 8 }}>P</td>
  <td style={{ textAlign: "center", fontWeight: "bold", padding: 8 }}>M</td>
</tr>
              {PLANNING.map((item) => (
                <ScoreRow
                  key={item.id}
                  item={item}
                  value={scores[item.id] || null}
                  onChange={handleScoreChange}
                  hasError={!!errors[item.id]}
                />
              ))}

<tr style={{ background: NAVY, color: WHITE }}>
  <td style={{ padding: 8, fontWeight: "bold" }}>INSTRUCTION</td>
  <td style={{ textAlign: "center", fontWeight: "bold", padding: 8 }}>U</td>
  <td style={{ textAlign: "center", fontWeight: "bold", padding: 8 }}>P</td>
  <td style={{ textAlign: "center", fontWeight: "bold", padding: 8 }}>M</td>
</tr>
              {INSTRUCTION.map((item) => (
                <ScoreRow
                  key={item.id}
                  item={item}
                  value={scores[item.id] || null}
                  onChange={handleScoreChange}
                  hasError={!!errors[item.id]}
                />
              ))}

<tr style={{ background: NAVY, color: WHITE }}>
  <td style={{ padding: 8, fontWeight: "bold" }}>CLASSROOM CULTURE</td>
  <td style={{ textAlign: "center", fontWeight: "bold", padding: 8 }}>U</td>
  <td style={{ textAlign: "center", fontWeight: "bold", padding: 8 }}>P</td>
  <td style={{ textAlign: "center", fontWeight: "bold", padding: 8 }}>M</td>
</tr>
              {CULTURE.map((item) => (
                <ScoreRow
                  key={item.id}
                  item={item}
                  value={scores[item.id] || null}
                  onChange={handleScoreChange}
                  hasError={!!errors[item.id]}
                />
              ))}
            </tbody>
          </table>

          <div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 36px 36px 36px",
    justifyContent: "end",
    rowGap: 8,
    marginBottom: 20,
    width: "100%",
  }}
>
    {/* Total Points */}
    <div style={{ textAlign: "right", fontWeight: "bold", paddingRight: 8 }}>
    Total Points:
  </div>
  <div></div>
  <div style={{ textAlign: "center", fontWeight: "bold" }}>
    {totalPoints.toFixed(1)}
  </div>
  <div></div>

  {/* Proficiency */}
  <div style={{ textAlign: "right", fontWeight: "bold", paddingRight: 8 }}>
    Proficiency Projection:
  </div>
  <div></div>
  <div
    style={{
      textAlign: "center",
      fontWeight: "bold",
      color: proficiency.color,
    }}
  >
    {proficiency.label}
  </div>
  <div></div>
</div>  

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4 }}>Praise</label>
            <textarea value={praise} onChange={(e) => setPraise(e.target.value)} rows={2} style={{ width: "100%" }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4 }}>Polish</label>
            <textarea value={polish} onChange={(e) => setPolish(e.target.value)} rows={2} style={{ width: "100%" }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 4 }}>Question</label>
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} style={{ width: "100%" }} />
          </div>

          <div
  style={{
    marginBottom: 20,
    border: "1px solid #444",
    fontFamily: "Georgia, serif",
  }}
>
  <div
    style={{
      background: "#d4a514",
      textAlign: "center",
      fontWeight: "bold",
      fontSize: 14,
      padding: "2px 0",
      borderBottom: "1px solid #444",
    }}
  >
    Proficiency Level
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(7, 1fr)",
      borderBottom: "1px solid #444",
    }}
  >
    {[
      ["0 - 5.5", "UNSAT"],
      ["6 - 7.5", "PROG I"],
      ["8 - 10", "PROG II"],
      ["10.5 - 14", "PROF I"],
      ["14.5 - 16.5", "PROF II"],
      ["17 - 17.5", "EXEMP I"],
      ["18", "EXEMP II"],
    ].map(([range, label], index, arr) => {
      const active = proficiency.label === label;

      return (
        <div
          key={label}
          style={{
            textAlign: "center",
            padding: "2px 4px",
            background: active ? "#fff3cd" : "#e6e6e6",
            borderRight: index < arr.length - 1 ? "1px solid #444" : "none",
            fontWeight: active ? "bold" : "normal",
          }}
        >
          {range}
        </div>
      );
    })}
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(7, 1fr)",
    }}
  >
    {[
      "UNSAT",
      "PROG I",
      "PROG II",
      "PROF I",
      "PROF II",
      "EXEMP I",
      "EXEMP II",
    ].map((label, index, arr) => {
      const active = proficiency.label === label;

      return (
        <div
          key={label}
          style={{
            textAlign: "center",
            padding: "2px 4px",
            background: active ? "#fff3cd" : "#e6e6e6",
            borderRight: index < arr.length - 1 ? "1px solid #444" : "none",
            fontWeight: active ? "bold" : "normal",
          }}
        >
          {label}
        </div>
      );
    })}
  </div>
</div>

<div
  style={{
    textAlign: "center",
    color: "red",
    fontSize: 12,
    marginBottom: 20,
  }}
>
  Note: Spot scores are NOT rounded
</div>

          {attempted && Object.keys(errors).length > 0 && (
            <div
              style={{
                background: "#fff5f5",
                border: `1px solid ${RED}`,
                padding: 12,
                marginBottom: 16,
                borderRadius: 4,
                color: RED,
                fontSize: 12,
              }}
            >
              Please complete all required fields and score all indicators.
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              background: isSubmitting ? "#7a869a" : NAVY,
              color: WHITE,
              border: "none",
              borderRadius: 4,
              padding: "12px 24px",
              fontSize: 15,
              fontWeight: "bold",
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "Submitting..." : "Submit Observation"}
          </button>
        </div>
      </div>
    </div>
  );
}



export default App;