exports.handler = async (event, context) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const url = "https://script.google.com/macros/s/AKfycbyDvyxndPBuoh1VKrwmakRnqUtjNYltADvRoCHo7WAyWOMpB0ZfIT-rROu1siWBrbopIQ/exec?email=testuser@example.com&tier=pro";
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

    console.log("Actual runtime response:", html);
    console.log("Response headers:", JSON.stringify([...response.headers]));
    console.log("Response length:", html.length);

    // Find the outer userHtml
    const userHtmlAny = html.indexOf('userHtml');
    console.log("Any 'userHtml' occurrence:", userHtmlAny);
    if (userHtmlAny === -1) throw new Error("No userHtml found in response");

    const snippetStart = Math.max(0, userHtmlAny - 20);
    const snippetEnd = Math.min(html.length, userHtmlAny + 500);
    const rawSnippet = html.substring(snippetStart, snippetEnd);
    console.log("Raw snippet around 'userHtml':", rawSnippet);

    // Find the end of the goog.script.init JSON object
    let jsonEnd = userHtmlAny;
    let braceCount = 0;
    let inQuotes = false;
    while (jsonEnd < html.length) {
      const char = html[jsonEnd];
      if (char === '"' && html[jsonEnd - 1] !== '\\') inQuotes = !inQuotes;
      if (!inQuotes) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (braceCount === 0 && char === '}') break; // End of JSON object
      }
      jsonEnd++;
    }
    console.log("JSON object end:", jsonEnd);

    // Find the script tag after the JSON object
    const scriptStart = html.indexOf('<script>', jsonEnd);
    if (scriptStart === -1) throw new Error("No script tag found after JSON object");
    console.log("Script start index:", scriptStart);

    // Find the nested userHtml within the script tag
    const nestedUserHtml = html.indexOf('"userHtml":"', scriptStart);
    if (nestedUserHtml === -1) throw new Error("No nested userHtml found in script");
    console.log("Nested userHtml index:", nestedUserHtml);

    const colonIndex = html.indexOf(':', nestedUserHtml);
    if (colonIndex === -1) throw new Error("Colon after nested userHtml not found");

    const quoteIndex = html.indexOf('"', colonIndex + 1);
    if (quoteIndex === -1) throw new Error("Quote after colon not found");

    let start = html.indexOf('{', quoteIndex);
    if (start === -1) {
      console.log("No { found after nested userHtml - raw snippet:", html.substring(quoteIndex, quoteIndex + 50));
      const decodedHtml = html.substring(quoteIndex).replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      const braceIndex = decodedHtml.indexOf('{');
      if (braceIndex === -1) {
        console.log("No decoded { found either - decoded snippet:", decodedHtml.substring(0, 50));
        throw new Error("Opening brace after nested userHtml not found");
      }
      start = quoteIndex + braceIndex;
    }
    console.log("Colon index:", colonIndex);
    console.log("Quote index:", quoteIndex);
    console.log("Start position (raw):", start);
    console.log("Char at start (raw):", html[start]);
    console.log("Raw snippet at start:", html.substring(start, start + 50));

    let jsonString = html.substring(start);
    jsonString = jsonString
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

    let end = start;
    let braceCountInner = 0;
    let inQuotesInner = false;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];
      if (i < 100 || i > jsonString.length - 100 || char === '{' || char === '}' || char === '"') {
        console.log(`Char at ${start + i}: '${char}' (code: ${char.charCodeAt(0)}), inQuotes: ${inQuotesInner}, braceCount: ${braceCountInner}`);
      }
      if (char === '"' && (i === 0 || jsonString[i - 1] !== '\\')) {
        inQuotesInner = !inQuotesInner;
        console.log(`Quote toggle at ${start + i}: inQuotes = ${inQuotesInner}`);
      }
      if (!inQuotesInner) {
        if (char === '{') {
          braceCountInner++;
          console.log(`Open brace at ${start + i}: braceCount = ${braceCountInner}`);
        } else if (char === '}') {
          braceCountInner--;
          console.log(`Close brace at ${start + i}: braceCount = ${braceCountInner}`);
          if (braceCountInner === 0) {
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