import React, { useState, useEffect, useRef } from "react";
import mondaySdk from "monday-sdk-js";
import { Button, TextField } from "@vibe/core";

const monday = mondaySdk();

const EmployersTab = () => {
  const [context, setContext] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("avoda_token") || "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState(
    `query users($limit: Int, $page: Int) {
  users(limit: $limit, page: $page, roles: EMPLOYER) {
    users {
      id
      firstName
      lastName
      phone
      address
      email
      createdAt
      lastActivity
      isConfirmed
      hasActiveJobListing
      isArchived
      business { id name branch { name } }
    }
    count
  }
}`
  );
  const [queryResult, setQueryResult] = useState(null);
  const [parsed, setParsed] = useState([]);
  const [page, setPage] = useState(0);
  const [totalFetched, setTotalFetched] = useState(0);
  const isCancelled = useRef(false);

  useEffect(() => {
    monday.get("context").then(res => {
      console.log(res);
      setContext(res.data);
    }
    );
    
    monday.listen("context", (res) => {
      setContext(res.data);
    });

    monday
      .api(`query { me { id name email } }`)
      .then((res) => setUser(res.data.me))
      .catch(() => setError("Failed to load user details."));
  }, []);

  const saveToken = () => {
    if (!token.trim()) {
      setError("Token cannot be empty");
      return;
    }
    localStorage.setItem("avoda_token", token.trim());
    setSaved(true);
    setError("");
  };

  const runQuery = async () => {
    setError("");
    try {
      const res = await fetch("https://avodaplus-api.noal.org.il/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query, variables: { limit: 100, page: 1 } })
      });
      const json = await res.json();
      console.log("🟢 Query result:", json);
      setQueryResult(json);
    } catch (e) {
      setError("Query failed: " + e.message);
    }
  };

  const parseResult = () => {
    try {
      const users = queryResult?.data?.users?.users;
      if (!Array.isArray(users)) throw new Error("No users array");
      const mapped = users.map(u => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        address: u.address,
        email: u.email,
        createdAt: u.createdAt ? u.createdAt.split('T')[0] : "",
        lastActivity: u.lastActivity ? u.lastActivity.split('T')[0] : "",
        isConfirmed: u.isConfirmed,
        hasActiveJobListing: u.hasActiveJobListing,
        isArchived: u.isArchived,
        businessId: u.business?.id,
        businessName: u.business?.name,
        businessBranch: u.business?.branch?.name || ""
      }));
      setParsed(mapped);
    } catch (e) {
      setError("Parse error: " + e.message);
    }
  };

  const fetchAll = async () => {
    if (!token) {
      setError("Token required");
      return;
    }
    isCancelled.current = false;
    setPage(0);
    setTotalFetched(0);
    let all = [];
    let p = 1;

    while (!isCancelled.current) {
      try {
        const res = await fetch("https://avodaplus-api.noal.org.il/", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ query, variables: { limit: 100, page: p } })
        });
        const json = await res.json();
        console.log(`🟢 Fetch page ${p} result:`, json);
        const users = json?.data?.users?.users;
        if (!users?.length) break;
        all = all.concat(users);
        setPage(p);
        setTotalFetched(all.length);
        p++;
      } catch {
        break;
      }
    }
    setQueryResult({ data: { users: { users: all } } });
    console.log("✅ Finished fetching all employers:", all.length, "users");
    // parseResult();
  };

  useEffect(() => {
    if (queryResult?.data?.users?.users) {
      parseResult();
    }
  }, [queryResult]);
  
  const stopFetch = () => {
    isCancelled.current = true;
  };

  const insertToBoard = async () => {
    const boardId = (await monday.get("context")).data.boardId;
    for (let u of parsed) {
      try {
        await monday.api(`mutation {
          create_item(
            board_id: ${boardId},
            item_name: "${u.firstName} ${u.lastName}",
            column_values: ${JSON.stringify({
              text_mkqcc626: u.id,
              text_mknxwg7x: u.firstName,
              text_mknxkn77: u.lastName,
              phone_mkq85bdr: { phone: u.phone, countryShortName: "IL" },
              date_mknf7w5k: { date: u.createdAt },
              text_mkqax1wa: u.businessName,
              text_mknfq7yw: u.businessId,
              email_mknx1jzw: u.email,
              color_mknxqf9h: { label: u.isConfirmed ? "true" : "false" },
              color_mknw5117: { label: u.hasActiveJobListing ? "true" : "false" },
              text_mknwvns7: u.address,
              date_mkqamv44: { date: u.lastActivity },
              text_mkqcezmy: u.businessBranch,
              color_mkqadg1s: { label: u.isArchived ? "true" : "false" }
            })}
          ) { id }
        }`);
      } catch (e) {
        console.error("Insert failed for", u, e.message);
      }
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h3>🧑‍💼 Employers Import</h3>
      <p>You're viewing board ID: <strong>{context?.boardId}</strong></p>
      <br />
      <TextField label="API Token" value={token} onChange={setToken} />
      <Button onClick={saveToken} style={{ backgroundColor: '#4caf50', margin: '0.5rem' }}>
        Save Token {saved && '✅'}
      </Button>
      {error && <div style={{ color: 'red', margin: '0.5rem 0' }}>{error}</div>}

      <textarea
        value={query}
        onChange={e => setQuery(e.target.value)}
        rows={6}
        style={{ width: '100%', margin: '0.5rem 0' }}
      />
      <Button onClick={runQuery} style={{ backgroundColor: '#2196f3', margin: '0.25rem' }}>
        Run Query
      </Button>
      <Button onClick={parseResult} style={{ backgroundColor: '#ff9800', margin: '0.25rem' }}>
        Parse Result
      </Button>

      {/* Review Table */}
      {parsed.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '1rem 0' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>ID</th>
              <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>First Name</th>
              <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Last Name</th>
              <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Phone</th>
              <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Address</th>
              <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Email</th>
              <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Registered</th>
              <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Last Activity</th>
              <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Confirmed</th>
              <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Active Job</th>
              <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Archived</th>
              <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Business ID</th>
              <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Business Name</th>
              <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Business Branch</th>
            </tr>
          </thead>
          <tbody>
            {parsed.map((u, idx) => (
              <tr key={idx}>
                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{u.id}</td>
                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{u.firstName}</td>
                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{u.lastName}</td>
                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{u.phone}</td>
                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{u.address}</td>
                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{u.email}</td>
                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{u.createdAt}</td>
                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{u.lastActivity}</td>
                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{u.isConfirmed ? "✅" : "❌"}</td>
                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{u.hasActiveJobListing ? "✅" : "❌"}</td>
                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{u.isArchived ? "✅" : "❌"}</td>
                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{u.businessId}</td>
                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{u.businessName}</td>
                <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{u.businessBranch}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Button onClick={fetchAll} style={{ backgroundColor: '#673ab7', margin: '0.25rem' }}>
        📥 Fetch All
      </Button>
      <Button onClick={stopFetch} style={{ backgroundColor: '#f44336', margin: '0.25rem' }}>
        🛑 Stop Fetch
      </Button>
      <Button onClick={insertToBoard} style={{ backgroundColor: '#4caf50', margin: '0.5rem 0' }}>
        🚀 Insert All to Board
      </Button>
    </div>
  );
};

export default EmployersTab;
