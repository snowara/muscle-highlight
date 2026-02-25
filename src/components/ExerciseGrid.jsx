import { useState } from "react";
import { EXERCISE_DB, CATEGORIES } from "../data/exercises";

const exerciseEntries = Object.entries(EXERCISE_DB);

export default function ExerciseGrid({ selectedExercise, onSelect }) {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all"
    ? exerciseEntries
    : exerciseEntries.filter(([, ex]) => ex.category === filter);

  return (
    <div className="exercise-grid-wrapper">
      <div className="exercise-filter">
        <button
          className={`filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          전체
        </button>
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <button
            key={key}
            className={`filter-btn ${filter === key ? "active" : ""}`}
            onClick={() => setFilter(key)}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      <div className="exercise-grid">
        {filtered.map(([key, ex]) => (
          <button
            key={key}
            className={`exercise-card ${selectedExercise === key ? "selected" : ""}`}
            onClick={() => onSelect(key)}
          >
            <span className="exercise-icon">{ex.icon}</span>
            <span className="exercise-name">{ex.name}</span>
            <span className="exercise-difficulty">
              {"●".repeat(ex.difficulty)}{"○".repeat(5 - ex.difficulty)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
