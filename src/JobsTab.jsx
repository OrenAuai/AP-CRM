import React, { useEffect, useState, useRef } from "react";
import mondaySdk from "monday-sdk-js";
import { Button } from "@vibe/core";

const monday = mondaySdk();

const JobsTab = () => {
  const [context, setContext] = useState(null);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("avoda_token") || "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState(`query { jobs { id name } }`);
  const [queryResult, setQueryResult] = useState(null);
  const [parsedJobs, setParsedJobs] = useState([]);
  const [page, setPage] = useState(0);
  const [jobIndex, setJobIndex] = useState(0);
  const [currentJobName, setCurrentJobName] = useState("");
  const isCancelled = useRef(false);

  useEffect(() => {
    monday.execute("valueCreatedForUser");
    monday.get("context").then((res) => setContext(res.data));
    monday.api(`query { me { id name email } }`)
      .then((res) => setUser(res.data.me))
      .catch(() => setError("Failed to load user details."));
  }, []);

  const handleTokenSave = () => {
    if (token.trim() === "") {
      setSaved(false);
      setError("Token cannot be empty.");
      return;
    }
    localStorage.setItem("avoda_token", token.trim());
    setSaved(true);
    setError("");
  };

  const runQuery = async () => {
    if (!token) {
      setError("Missing token");
      return;
    }
    try {
      const response = await fetch("https://avodaplus-api.noal.org.il/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query })
      });
      const data = await response.json();
      setQueryResult(data);
    } catch (err) {
      setError("Query failed: " + err.message);
    }
  };

  const parseQueryResult = () => {
    try {
      const data = queryResult?.data;
      if (!data) throw new Error("No data in query result");
      let jobList = [];
      if (data.jobListings?.jobListings) {
        jobList = data.jobListings.jobListings;
      } else if (Array.isArray(data.jobs)) {
        jobList = data.jobs;
      }
      if (!jobList.length) throw new Error("No recognizable job listings found");
      const parsed = jobList.map((job) => ({
        "מזהה פרסום משרה": job.id,
        "שם משרה": job.name,
        "מקום עבודה": job.workplace,
        "טלפון לפניות": job.phone,
        "טלפון לוואטסאפ": job.whatsapp,
        "תאריך יצירה": job.createdAt,
        "תאריך פרסום": job.airsAt,
        "מספר עובדים דרושים": job.jobsMannedAmount,
        "גיל": job.minimumAge,
        "שכר": job.hourlyRate,
        "שם פרטי איש קשר": job.business?.owner?.firstName,
        "שם משפחה איש קשר": job.business?.owner?.lastName,
        "פניות וואטסאפ": job.totalWhatsappApplications,
        "פניות טלפון": job.totalPhoneApplications,
        "פניות ייחודיות": job.uniqueApplications,
        "תאריך ירידה מהאוויר": job.endTime,
        "כתובת": job.addresses?.[0],
        "אזור": job.area?.name,
        "דרישות": job.requirements,
        "תיאור": job.description,
        "מזהה מעסיק": job.business?.owner?.id
      }));
      setParsedJobs(parsed);
      console.log("✅ Parsed jobs:", parsed);
    } catch (e) {
      setError("Failed to parse query result: " + e.message);
      console.error("❌ Parsing error:", e.message);
    }
  };

  const stopFetch = () => {
    isCancelled.current = true;
  };

  const fetchAllJobs = async () => {
    if (!token) {
      setError("Missing token");
      return;
    }
    let allJobs = [];
    let currentPage = 1;
    isCancelled.current = false;
    while (!isCancelled.current) {
      try {
        const response = await fetch("https://avodaplus-api.noal.org.il/", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            query: `query jobListings($limit: Int, $page: Int, $isBlocked: Boolean, $approvalStatus: ApprovalStatus) {
              jobListings(limit: $limit, page: $page, isBlocked: $isBlocked, where: { approvalStatus: $approvalStatus }) {
                jobListings {
                  id name workplace phone whatsapp createdAt airsAt jobsMannedAmount minimumAge hourlyRate
                  business { owner { id firstName lastName } }
                  totalWhatsappApplications totalPhoneApplications uniqueApplications endTime
                  addresses area { id name } requirements description
                }
                count
              }
            }`,
            variables: { page: currentPage, limit: 100, isBlocked: false, approvalStatus: "APPROVED" }
          })
        });
        const json = await response.json();
        const jobs = json?.data?.jobListings?.jobListings;
        if (!jobs || jobs.length === 0) break;
        allJobs = [...allJobs, ...jobs];
        setPage(currentPage);
        setJobIndex(allJobs.length);
        setCurrentJobName(jobs[jobs.length - 1]?.name || "");
        currentPage++;
      } catch (err) {
        console.error("Fetch page failed:", err);
        break;
      }
    }
    setParsedJobs(allJobs);
  };

  return (
    <div>
      <h2>Job Listings Import</h2>

      <h3>🔑 API Token</h3>
      <input type="text" value={token} onChange={(e) => setToken(e.target.value)} />
      <button onClick={handleTokenSave}>Save Token</button>
      {saved && <p style={{ color: "green" }}>✅ Token saved!</p>}

      <h3>🧠 Query Playground</h3>
      <textarea value={query} onChange={(e) => setQuery(e.target.value)} rows={8} style={{ width: "100%" }} />
      <button onClick={runQuery}>📡 Run Playground Query</button>
      <button onClick={parseQueryResult} style={{ marginLeft: "0.5rem" }}>🧩 Parse Query Result to Jobs</button>

      {queryResult && (
        <pre style={{ background: "#eee", padding: "1rem", marginTop: "1rem" }}>{JSON.stringify(queryResult, null, 2)}</pre>
      )}

      <h3>📥 Import Entire Job Listings</h3>
      <Button onClick={fetchAllJobs}>🚀 Fetch All Jobs</Button>
      <Button onClick={stopFetch} style={{ marginLeft: "1rem" }}>🛑 Stop</Button>
      <p>📄 Current Page: {page}</p>
      <p>📌 Total Jobs Fetched: {jobIndex} {currentJobName && `(Last: ${currentJobName})`}</p>
    </div>
  );
};

export default JobsTab;
