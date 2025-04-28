import React, { useState, useEffect, useRef } from "react";
import mondaySdk from "monday-sdk-js";
import { Button, TextField, Loader } from "@vibe/core";
import { User, ParsedUser, QueryResponse } from "./types";

const monday = mondaySdk();

const EmployersTab: React.FC = () => {
  const [context, setContext] = useState<any>(null);
  const [token, setToken] = useState<string>(localStorage.getItem("avoda_token") || "");
  const [saved, setSaved] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [query, setQuery] = useState<string>(
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
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null);
  const [parsed, setParsed] = useState<ParsedUser[]>([]);
  const [page, setPage] = useState<number>(0);
  const [totalFetched, setTotalFetched] = useState<number>(0);
  const isCancelled = useRef<boolean>(false);

  useEffect(() => {
    monday.get("context").then(res => {
      console.log(res);
      setContext(res.data);
    });
    
    monday.listen("context", (res) => {
      setContext(res.data);
    });
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
    setIsLoading(true);
    try {
      const res = await fetch("https://avodaplus-api.noal.org.il/", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ query, variables: { limit: 100, page: 1 } })
      });
      const json = await res.json();
      console.log("🟢 Query result:", json);
      if (json.errors) {
        throw new Error(json.errors[0].message);
      }
      setQueryResult(json);
    } catch (e) {
      setError("Query failed: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setIsLoading(false);
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
      setError("Parse error: " + (e instanceof Error ? e.message : "Unknown error"));
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
    setIsLoading(true);
    let all: User[] = [];
    let p = 1;

    while (!isCancelled.current) {
      try {
        const res = await fetch("https://avodaplus-api.noal.org.il/", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ query, variables: { limit: 100, page: p } })
        });
        const json: QueryResponse = await res.json();
        console.log(`🟢 Fetch page ${p} result:`, json);
        if (json.errors) {
          throw new Error(json.errors[0].message);
        }
        const users = json?.data?.users?.users;
        if (!users?.length) break;
        all = all.concat(users);
        setPage(p);
        setTotalFetched(all.length);
        p++;
      } catch (e) {
        setError("Fetch error: " + (e instanceof Error ? e.message : "Unknown error"));
        break;
      }
    }
    setQueryResult({ data: { users: { users: all, count: all.length } } });
    console.log("✅ Finished fetching all employers:", all.length, "users");
    setIsLoading(false);
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
    if (!parsed.length) {
      setError("No data to insert");
      return;
    }

    setImportProgress(0);
    const boardId = (await monday.get("context")).data.boardId;
    let successCount = 0;

    for (let [index, u] of parsed.entries()) {
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
        successCount++;
      } catch (e) {
        console.error("Insert failed for", u, e instanceof Error ? e.message : "Unknown error");
      }
      setImportProgress(Math.round((index + 1) / parsed.length * 100));
    }

    setError(successCount === parsed.length 
      ? `Successfully imported all ${parsed.length} records` 
      : `Imported ${successCount} out of ${parsed.length} records`);
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h3>🧑‍💼 Employers Import</h3>
      <p>You're viewing board ID: <strong>{context?.boardId}</strong></p>
      <br />
      
      <div style={{ marginBottom: '1rem' }}>
        <TextField 
          label="API Token" 
          value={token} 
          onChange={setToken}
          type="password"
        />
        <Button 
          onClick={saveToken} 
          style={{ backgroundColor: '#4caf50', margin: '0.5rem' }}
        >
          Save Token {saved && '✅'}
        </Button>
      </div>

      {error && (
        <div style={{ 
          color: error.includes("Successfully") ? 'green' : 'red', 
          margin: '0.5rem 0',
          padding: '0.5rem',
          backgroundColor: error.includes("Successfully") ? '#e8f5e9' : '#ffebee',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}

      <textarea
        value={query}
        onChange={e => setQuery(e.target.value)}
        rows={6}
        style={{ 
          width: '100%', 
          margin: '0.5rem 0',
          padding: '0.5rem',
          fontFamily: 'monospace'
        }}
      />

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <Button 
          onClick={runQuery} 
          style={{ backgroundColor: '#2196f3' }}
          disabled={isLoading}
        >
          {isLoading ? <Loader size={16} /> : 'Run Query'}
        </Button>
        <Button 
          onClick={parseResult} 
          style={{ backgroundColor: '#ff9800' }}
          disabled={!queryResult}
        >
          Parse Result
        </Button>
        <Button 
          onClick={fetchAll} 
          style={{ backgroundColor: '#673ab7' }}
          disabled={isLoading}
        >
          📥 Fetch All
        </Button>
        <Button 
          onClick={stopFetch} 
          style={{ backgroundColor: '#f44336' }}
          disabled={!isLoading}
        >
          🛑 Stop Fetch
        </Button>
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '1rem' }}>
          <Loader size={32} />
          <p>Fetching data... Page {page}, Total records: {totalFetched}</p>
        </div>
      )}

      {parsed.length > 0 && (
        <>
          <div style={{ 
            overflowX: 'auto', 
            maxHeight: '400px',
            marginBottom: '1rem',
            border: '1px solid #e0e0e0',
            borderRadius: '4px'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white' }}>
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
          </div>

          <Button 
            onClick={insertToBoard} 
            style={{ backgroundColor: '#4caf50', width: '100%' }}
          >
            🚀 Insert All to Board
            {importProgress > 0 && ` (${importProgress}%)`}
          </Button>
        </>
      )}
    </div>
  );
};

export default EmployersTab;