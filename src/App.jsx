import React, { useState } from "react";
import JobsTab from "./JobsTab";
import EmployersTab from "./EmployersTab";

const App = () => {
  const [activeTab, setActiveTab] = useState("jobs");

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>🚀 CRM Import Tool</h1>

      {/* Tabs */}
      <div style={{ marginBottom: "1rem" }}>
        <button
          onClick={() => setActiveTab("jobs")}
          style={{
            padding: "0.5rem 1rem",
            marginRight: "0.5rem",
            backgroundColor: activeTab === "jobs" ? "#4caf50" : "#e0e0e0",
            color: activeTab === "jobs" ? "white" : "black",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          📝 Job Listings
        </button>

        <button
          onClick={() => setActiveTab("employers")}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: activeTab === "employers" ? "#4caf50" : "#e0e0e0",
            color: activeTab === "employers" ? "white" : "black",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          🧑‍💼 Employers
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "jobs" && <JobsTab />}
      {activeTab === "employers" && <EmployersTab />}
    </div>
  );
};

export default App;
