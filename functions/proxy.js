exports.handler = async (event, context) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const url = "https://script.google.com/macros/s/AKfycbz273eq-2tvp0Pv-n9t5mBiisTcvjYmsjA-TyTfdS57D2nLMdohIgmCB_WXQptlXFpv/exec?email=testuser@example.com&tier=pro";
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124",
        "Accept": "application/json, text/html, */*",
        "Cache-Control": "no-cache",
        "Referer": "https://script.google.com",
        "Origin": "https://script.google.com",
        "Accept-Encoding": "gzip, deflate, br",
        "Host": "script.google.com",
        "Connection": "keep-alive"
      }
    });
    if (!response.ok) throw new Error(`Fetch failed: ${response.status} - ${response.statusText}`);
    let html = await response.text();

    console.log("Full raw response from v4:", html);
    console.log("Response headers:", JSON.stringify([...response.headers]));
    console.log("Response length:", html.length);

    const userHtmlAny = html.indexOf('userHtml');
    console.log("Any 'userHtml' occurrence:", userHtmlAny);
    if (userHtmlAny === -1) throw new Error("No userHtml found in response");

    const snippetStart = Math.max(0, userHtmlAny - 20);
    const snippetEnd = Math.min(html.length, userHtmlAny + 100);
    const rawSnippet = html.substring(snippetStart, snippetEnd);
    console.log("Raw snippet around 'userHtml':", rawSnippet);

    // Decode only the relevant segment
    const decodedSnippet = rawSnippet.replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    console.log("Decoded snippet around 'userHtml':", decodedSnippet);

    const colonIndex = decodedSnippet.indexOf(':', decodedSnippet.indexOf('userHtml'));
    if (colonIndex === -1) throw new Error("Colon after userHtml not found");

    // Find the first { after colon
    let startBraceIndex = -1;
    for (let i = colonIndex + 1; i < decodedSnippet.length; i++) {
      const char = decodedSnippet[i];
      console.log(`Char at ${snippetStart + i}: '${char}' (code: ${char.charCodeAt(0)})`);
      if (char === '{') {
        startBraceIndex = snippetStart + i;
        break;
      }
    }
    if (startBraceIndex === -1) {
      console.log("No brace found after colon - decoded snippet:", decodedSnippet);
      throw new Error("Opening brace after colon not found");
    }
    const start = startBraceIndex; // Start at {
    console.log("Colon index (in snippet):", colonIndex);
    console.log("Start brace index (absolute):", startBraceIndex);
    console.log("Start position:", start);
    console.log("Char at start:", html[start]);
    console.log("Snippet at start:", html.substring(start, start + 50));

    let jsonString = html.substring(start);
    jsonString = jsonString
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

    let end = start;
    let braceCount = 0;
    let inQuotes = false;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];
      if (i < 100 || i > jsonString.length - 100 || char === '{' || char === '}' || char === '"') {
        console.log(`Char at ${start + i}: ${char}, inQuotes: ${inQuotes}, braceCount: ${braceCount}`);
      }
      if (char === '"' && (i === 0 || jsonString[i - 1] !== '\\')) {
        inQuotes = !inQuotes;
        console.log(`Quote toggle at ${start + i}: inQuotes = ${inQuotes}`);
      }
      if (!inQuotes) {
        if (char === '{') {
          braceCount++;
          console.log(`Open brace at ${start + i}: braceCount = ${braceCount}`);
        } else if (char === '}') {
          braceCount--;
          console.log(`Close brace at ${start + i}: braceCount = ${braceCount}`);
          if (braceCount === 0) {
            end = start + i + 1;
            break;
          }
        }
      }
    }
    console.log("End position:", end);

    if (end === start) throw new Error("Failed to extract userHtml JSON - no valid end marker found");

    jsonString = jsonString.substring(0, end - start);
    console.log("Extracted userHtml JSON (raw):", jsonString);

    const data = JSON.parse(jsonString);
    delete data.gasPrices;
    console.log("Parsed JSON data:", JSON.stringify(data));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.log("Error occurred:", error.message);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};