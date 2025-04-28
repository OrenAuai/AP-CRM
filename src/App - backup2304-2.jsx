import React, { useEffect, useState, useRef } from "react";
import "./App.css";
import mondaySdk from "monday-sdk-js";
import "@vibe/core/tokens";
import { AttentionBox, Button } from "@vibe/core";

const monday = mondaySdk();

const App = () => {
  const [context, setContext] = useState(null);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("avoda_token") || "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState(`query { jobs { id name } }`);
  const [parsedJobs, setParsedJobs] = useState([]);
  const [page, setPage] = useState(0);
  const [jobIndex, setJobIndex] = useState(0);
  const [currentJobName, setCurrentJobName] = useState("");
  const isCancelled = useRef(false);

  useEffect(() => {
    monday.execute("valueCreatedForUser");

    monday.get("context").then((res) => {
      setContext(res.data);
    });

    monday.listen("context", (res) => {
      setContext(res.data);
    });

    monday
      .api(`query { me { id name email } }`)
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
    setQuery(`query jobListings($limit: Int, $page: Int, $isBlocked: Boolean, $approvalStatus: ApprovalStatus) {
      jobListings(limit: $limit, page: $page, isBlocked: $isBlocked, where: { approvalStatus: $approvalStatus }) {
        jobListings {
          id name workplace phone whatsapp createdAt airsAt jobsMannedAmount minimumAge hourlyRate
          business { owner { id firstName lastName } }
          totalWhatsappApplications totalPhoneApplications uniqueApplications endTime
          addresses area { id name } requirements description
        }
        count
      }
    }`);
  };

  const stopFetch = () => {
    isCancelled.current = true;
  };

  const fetchAllJobs = async () => {
    if (!token || !context?.boardId) {
      setError("Missing token or board ID");
      return;
    }

    isCancelled.current = false;
    let allJobs = [];
    let pageCounter = 1;
    let done = false;

    while (!done && !isCancelled.current) {
      setPage(pageCounter);

      const res = await fetch("https://avodaplus-api.noal.org.il/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `
            query jobListings($limit: Int, $page: Int, $isBlocked: Boolean, $approvalStatus: ApprovalStatus) {
              jobListings(limit: $limit, page: $page, isBlocked: $isBlocked, where: { approvalStatus: $approvalStatus }) {
                jobListings {
                  id name workplace phone whatsapp createdAt airsAt jobsMannedAmount minimumAge hourlyRate
                  business { owner { id firstName lastName } }
                  totalWhatsappApplications totalPhoneApplications uniqueApplications endTime
                  addresses area { id name } requirements description
                }
                count
              }
            }
          `,
          variables: {
            limit: 100,
            page: pageCounter,
            isBlocked: false,
            approvalStatus: "APPROVED",
          },
        }),
      });

      const json = await res.json();
      const jobList = json?.data?.jobListings?.jobListings || [];

      if (jobList.length === 0) done = true;
      else {
        allJobs = [...allJobs, ...jobList];
        pageCounter++;
      }
    }

    const parsed = allJobs.map((job) => ({
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

    for (let i = 0; i < parsed.length && !isCancelled.current; i++) {
      const job = parsed[i];
      setJobIndex(i + 1);
      setCurrentJobName(job["שם משרה"]);

      try {
        await monday.api(`mutation { create_item(
          board_id: ${context.boardId},
          item_name: "${job["שם משרה"] || "משרה חדשה"}",
          column_values: ${JSON.stringify(JSON.stringify({
            name: job["מזהה פרסום משרה"],
            text_mkq8p89b: job["מזהה פרסום משרה"],
            text_mknf8xdn: job["שם משרה"],
            text_mknf15z0: job["מקום עבודה"],
            phone_mknfj7z1: { phone: job["טלפון לפניות"], countryShortName: "IL" },
            text_mkq81xpz: job["תאריך יצירה"],
            date_mknfazz8: { date: job["תאריך פרסום"]?.split("T")[0] },
            numeric_mknfhe4v: job["מספר עובדים דרושים"],
            numeric_mknffhqf: job["גיל"],
            numeric_mknfr56m: job["שכר"],
            text_mknf6c64: job["שם פרטי איש קשר"],
            text_mknfn83d: job["שם משפחה איש קשר"],
            numeric_mknfpgfc: job["פניות וואטסאפ"],
            numeric_mkq8n6jr: job["פניות טלפון"],
            numeric_mknf482k: job["פניות ייחודיות"],
            date_mknf3924: { date: job["תאריך ירידה מהאוויר"]?.split("T")[0] },
            text_mkq83nne: job["כתובת"],
            text_mkq89cxm: job["אזור"],
            text_mknfzhyw: job["דרישות"],
            text_mknfg5r9: job["תיאור"],
            text_mknfzh0m: job["מזהה מעסיק"]
          }))} ) { id } }`);
      } catch (err) {
        console.error("❌ Failed to create item:", err, job);
      }
    }
  };

  if (error) return <AttentionBox title="Error" text={error} />;
  if (!context || !user) return <div>Loading Monday context…</div>;

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h2>👋 Hello, {user.name}</h2>
      <p>You're viewing board ID: <strong>{context.boardId}</strong></p>

      <h3>🔑 API Token</h3>
      <input type="text" value={token} onChange={(e) => setToken(e.target.value)} />
      <button onClick={handleTokenSave}>Save Token</button>
      {saved && <p style={{ color: "green" }}>✅ Token saved!</p>}

      <h3>🧠 Query Playground</h3>
      <textarea value={query} onChange={(e) => setQuery(e.target.value)} rows={8} style={{ width: "100%" }} />
      <button onClick={runQuery}>Insert Job Query</button>

      <Button onClick={fetchAllJobs}>📥 Import All Job Listings</Button>
      <Button onClick={stopFetch} style={{ marginLeft: "1rem" }}>🛑 Stop Import</Button>
      <p>Page: {page} | Job: {jobIndex} {currentJobName && `(${currentJobName})`}</p>
    </div>
  );
};

export default App;
