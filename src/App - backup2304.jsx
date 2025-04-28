
import React, { useEffect, useState } from "react";
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
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedJobs, setParsedJobs] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentJobIndex, setCurrentJobIndex] = useState(0);
  const [currentJobName, setCurrentJobName] = useState("");



  useEffect(() => {
    monday.execute("valueCreatedForUser");

    // SAFELY fetch context once
    monday.get("context").then((res) => {
      console.log("✅ Context (get):", res.data);
      setContext(res.data);
    });

    // Optionally also listen for live context updates (filter changes, etc)
    monday.listen("context", (res) => {
      console.log("📦 Context (listen):", res.data);
      setContext(res.data);
    });

    // Get full user info
    monday
      .api(`query { me { id name email } }`)
      .then((res) => {
        console.log("👤 User info:", res.data.me);
        setUser(res.data.me);
      })
      .catch((err) => {
        console.error("❌ Failed to get user:", err);
        setError("Failed to load user details.");
      });
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
    console.log("🔐 Token saved");
  };
  
 /* const runQuery = async () => {
    if (!token) {
      setError("No token found. Please save your token first.");
      return;
    }
  
    setIsLoading(true);
    setResult(null);
    setError("");
  
    const query = `
      query jobListings($limit: Int, $page: Int, $isBlocked: Boolean, $approvalStatus: ApprovalStatus) {
        jobListings(limit: $limit, page: $page, isBlocked: $isBlocked, where: { approvalStatus: $approvalStatus }) {
          jobListings {
            id name workplace phone whatsapp createdAt airsAt jobsMannedAmount minimumAge hourlyRate
            business { owner { id firstName lastName } }
            totalWhatsappApplications totalPhoneApplications uniqueApplications endTime
            addresses area { id } requirements description
          }
          count
        }
      }
    `;
  
    const variables = {
      page: 1,
      limit: 100,
      isBlocked: false,
      approvalStatus: "APPROVED"
    };
  
    try {
      const response = await fetch("https://avodaplus-api.noal.org.il/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ query, variables })
      });
  
      const raw = await response.json();
  
      if (!raw?.data?.jobListings?.jobListings) {
        throw new Error("Response missing jobListings");
      }
  
      const jobList = raw.data.jobListings.jobListings;
  
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
  
      console.log("✅ Parsed job listings:", parsed);
      setResult(parsed);
      setParsedJobs(parsed);

    } catch (err) {
      console.error("❌ Query error:", err);
      setError("Query failed: " + err.message);
    }
  
    setIsLoading(false);
  };
 */
  const runQuery = async () => {
    if (!token) {
      setError("No token found. Please save your token first.");
      return;
    }
  
    setIsLoading(true);
    setResult(null);
    setError("");
  
    try {
      const response = await fetch("https://avodaplus-api.noal.org.il/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ query })  // Uses the freeform query box
      });
  
      const raw = await response.json();
      console.log("📦 Playground raw result:", raw);
      setResult(raw?.data || {});
    } catch (err) {
      console.error("❌ Playground error:", err);
      setError("Query failed: " + err.message);
    }
  
    setIsLoading(false);
  };

 const fetchAllJobs = async () => {
    if (!token) {
      setError("No token found. Please save your token first.");
      return;
    }
  
    setIsLoading(true);
    setResult(null);
    setError("");
    setCurrentPage(0);
    setCurrentJobIndex(0);
    setCurrentJobName("");
  
    const query = `
      query jobListings($limit: Int, $page: Int, $isBlocked: Boolean, $approvalStatus: ApprovalStatus) {
        jobListings(limit: $limit, page: $page, isBlocked: $isBlocked, where: { approvalStatus: $approvalStatus }) {
          jobListings {
            id name workplace phone whatsapp createdAt airsAt jobsMannedAmount minimumAge hourlyRate
            business { owner { id firstName lastName } }
            totalWhatsappApplications totalPhoneApplications uniqueApplications endTime
            addresses area { id } requirements description
          }
          count
        }
      }
    `;
  
    let allJobs = [];
    let page = 1;
  
    try {
      while (true) {
        setCurrentPage(page);
  
        const response = await fetch("https://avodaplus-api.noal.org.il/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            query,
            variables: {
              page,
              limit: 100,
              isBlocked: false,
              approvalStatus: "APPROVED"
            }
          })
        });
  
        const raw = await response.json();
        const jobs = raw?.data?.jobListings?.jobListings || [];
        if (jobs.length === 0) break;
  
        for (let i = 0; i < jobs.length; i++) {
          setCurrentJobIndex(allJobs.length + 1);
          setCurrentJobName(jobs[i].name || "לא ידוע");
          allJobs.push(jobs[i]);
        }
  
        page++;
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
        "אזור": job.area?.id,
        "דרישות": job.requirements,
        "תיאור": job.description,
        "מזהה מעסיק": job.business?.owner?.id
      }));
  
      console.log("✅ Parsed all job listings:", parsed);
      setResult(parsed);
      setParsedJobs(parsed);
  
    } catch (err) {
      console.error("❌ Pagination error:", err);
      setError("Query failed: " + err.message);
    }
  
    setIsLoading(false);
  };
  

const createItems = async () => {
  if (!parsedJobs || parsedJobs.length === 0) {

    console.warn("⚠️ No parsed data to insert.");
    return;
  }

  const boardIdFromContext = context?.boardId;
  if (!boardIdFromContext) {
    console.error("❌ Board ID is missing from context.");
    return;
  }

  for (const job of parsedJobs) {
    try {
      await monday.api(`
        mutation {
          create_item(
            board_id: ${boardIdFromContext},
            item_name: "${job["שם משרה"] || "משרה חדשה"}",
            column_values: ${JSON.stringify(JSON.stringify({
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
            }))}
          ) {
            id
          }
        }
      `);
    } catch (error) {
      console.error("❌ Failed to create item:", error, job);
    }
  }
};

  

  if (error) return <AttentionBox title="Error" text={error} />;
  if (!context || !user) return <div>Loading Monday context…</div>;

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h2>👋 Hello, {user.name}</h2>
      <p>You're viewing board ID: <strong>{context.boardId}</strong></p>
      <hr />
      <p>Next step: Add your token and send a query.</p>

      <h3>🔑 API Token</h3>
      <input
        type="text"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        style={{ width: "100%", padding: "8px", fontSize: "1rem" }}
      />
      <button onClick={handleTokenSave} style={{ marginTop: "0.5rem" }}>Save Token</button>
      {saved && <p style={{ color: "green" }}>✅ Token saved!</p>}

      <hr />

      <h3>🧠 Query</h3>
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        rows={6}
        style={{ width: "100%", fontFamily: "monospace", fontSize: "0.9rem" }}
      />
      <br />
      <button onClick={runQuery} disabled={isLoading}>
        {isLoading ? "Running..." : "Run Query"}
      </button>

      {isLoading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {result && (
        <div>
          <h3>Results:</h3>
          <ul>
            {result.map((job, index) => (
              <li key={index}>
                <strong>{job["שם משרה"]}</strong> at {job["מקום עבודה"]}<br />
                📞 {job["טלפון לפניות"] || "N/A"} | 💬 {job["טלפון לוואטסאפ"] || "N/A"}<br />
                💰 שכר: {job["שכר"]} | גיל מינימלי: {job["גיל"]}<br />
                📝 תיאור: {job["תיאור"]?.slice(0, 60)}...
              </li>
            ))}
          </ul>
        </div>
      )}
      <Button onClick={createItems} disabled={parsedJobs.length === 0}>
           Run the loop of creating items
      </Button>


    </div>
  );
};

export default App;
