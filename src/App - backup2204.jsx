/* import React from "react";
import { useState, useEffect } from "react";
import "./App.css";
import mondaySdk from "monday-sdk-js";
import "@vibe/core/tokens";
//Explore more Monday React Components here: https://vibe.monday.com/
import { AttentionBox } from "@vibe/core";

// Usage of mondaySDK example, for more information visit here: https://developer.monday.com/apps/docs/introduction-to-the-sdk/
const monday = mondaySdk();

const App = () => {
  const [context, setContext] = useState();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Notice this method notifies the monday platform that user gains a first value in an app.
    // Read more about it here: https://developer.monday.com/apps/docs/mondayexecute#value-created-for-user/
    monday.execute("valueCreatedForUser");

    // TODO: set up event listeners, Here`s an example, read more here: https://developer.monday.com/apps/docs/mondaylisten/
    monday.listen("context", (res) => {
      setContext(res.data);
    });
    // Get full user info (name, email)
    monday.api(`query { me { id name email } }`)
      .then((res) => setUser(res.data.me))
      .catch((err) => {
        console.error("Failed to get user info:", err);
        setError("Failed to load user details.");
      });


  }, []);
  if (error) return <AttentionBox title="Error" text={error} />;
  if (!context || !user) return <div>Loading Monday context…</div>;


  //Some example what you can do with context, read more here: https://developer.monday.com/apps/docs/mondayget#requesting-context-and-settings-data
  /* const attentionBoxText = `Hello, your user_id is: ${
    context ? context.user.id : "still loading"
  }.
  Let's start building your amazing app, which will change the world!`;
*/
/*
  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
    <h2>👋 Hello, {user.name}</h2>
    <p>You’re viewing board ID: <strong>{context.boardId}</strong></p>
    <hr />
    <p>Next step: Add your token and send a query.</p>
  </div>
  );
};

export default App;
*/
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
  /*const runQuery = async () => {
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
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error("❌ Query error:", err);
      setError(`Query failed: ${err.message}`);
    }

    setIsLoading(false);
  }; */
  const runQuery = async () => {
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
        "אזור": job.area?.id,
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
/*
  const createItemsFromParsedJobs = async () => {
    if (!context?.boardId) {
      console.error("❌ No boardId found in context");
      return;
    }
  
    const boardId = context.boardId;
  
    for (const job of parsedJobs) {
      try {
        const columnValues = {};
  
        for (const key in job) {
          columnValues[key] = { text: job[key]?.toString() ?? "" };
        }
  
        const res = await monday.api(`
          mutation {
            create_item (
              board_id: ${boardId},
              item_name: "${job["שם משרה"] || "משרה ללא שם"}",
              column_values: ${JSON.stringify(JSON.stringify(columnValues))}
            ) {
              id
            }
          }
        `);
  
        console.log("✅ Item created:", res?.data?.create_item?.id);
      } catch (err) {
        console.error("❌ Failed to create item for job ID", job["מזהה פרסום משרה"], err);
      }
    }
  };
*/
const createItems = async () => {
  if (!parsedData || parsedData.length === 0) {
    console.warn("⚠️ No parsed data to insert.");
    return;
  }

  const boardIdFromContext = context?.boardId;
  if (!boardIdFromContext) {
    console.error("❌ Board ID is missing from context.");
    return;
  }

  for (const job of parsedData) {
    try {
      await monday.api(`
        mutation {
          create_item(
            board_id: ${boardIdFromContext},
            item_name: "${job["שם משרה"] || "משרה חדשה"}",
            column_values: ${JSON.stringify(JSON.stringify({
              text_mknf8xdn: job["שם משרה"],
              text_mknf15z0: job["מקום עבודה"],
              phone_mknfj7z1: { phone: job["טלפון לפניות"], countryShortName: "IL" },
              phone_mkpkpcja: { phone: job["תאריך יצירה"], countryShortName: "IL" }, // Double check type later
              date_mknfazz8: { date: job["תאריך פרסום"]?.split("T")[0] },
              numeric_mknfhe4v: job["מספר עובדים דרושים"],
              numeric_mknffhqf: job["גיל"],
              numeric_mknfr56m: job["שכר"],
              text_mknf6c64: job["שם פרטי איש קשר"],
              text_mknfn83d: job["שם משפחה איש קשר"],
              numeric_mknfpgfc: job["פניות וואטסאפ"],
              text_mknf8ajc: job["פניות טלפון"],
              numeric_mknf482k: job["פניות ייחודיות"],
              date_mknf3924: { date: job["תאריך ירידה מהאוויר"]?.split("T")[0] },
              location_mknfpyxx: { address: job["כתובת"] },
              color_mknfn01s: job["אזור"],
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
      <Button onClick={createItemsFromParsedJobs} disabled={parsedJobs.length === 0}>
           Run the loop of creating items
      </Button>


    </div>
  );
};

export default App;
