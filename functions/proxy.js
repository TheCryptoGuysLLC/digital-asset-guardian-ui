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
    const snippetEnd = Math.min(html.length, userHtmlAny + 200); // Larger window
    const rawSnippet = html.substring(snippetStart, snippetEnd);
    console.log("Raw snippet around 'userHtml':", rawSnippet);

    // Decode only the relevant segment
    const decodedSnippet = rawSnippet.replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    console.log("Decoded snippet around 'userHtml':", decodedSnippet);

    const colonIndex = html.indexOf(':', userHtmlAny);
    if (colonIndex === -1) throw new Error("Colon after userHtml not found");

    const quoteIndex = html.indexOf('"', colonIndex + 1); // Opening quote after colon
    if (quoteIndex === -1) throw new Error("Quote after colon not found");

    // Try raw \x7b first, fallback to decoded {
    let start = html.indexOf('\\x7b', quoteIndex);
    if (start === -1) {
      console.log("No raw \\x7b found, trying decoded { - raw snippet:", html.substring(quoteIndex, quoteIndex + 50));
      const decodedHtml = html.substring(quoteIndex).replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      const braceIndex = decodedHtml.indexOf('{');
      if (braceIndex === -1) {
        console.log("No decoded { found either - decoded snippet:", decodedHtml.substring(0, 50));
        throw new Error("Opening brace after quote not found in raw or decoded string");
      }
      start = quoteIndex + braceIndex;
    }
    console.log("Colon index:", colonIndex);
    console.log("Quote index:", quoteIndex);
    console.log("Start position (raw):", start);
    console.log("Char at start (raw):", html[start]);
    console.log("Raw snippet at start:", html.substring(start, start + 50));

    // Extract and decode from raw string
    let jsonString = html.substring(start);
    jsonString = jsonString
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

    let end = start;
    let braceCount = 0;
    let inQuotes = false;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];
      if (i < 100 || i > jsonString.length - 100 || char === '{' || char === '}' || char === '"') {
        console.log(`Char at ${start + i}: '${char}' (code: ${char.charCodeAt(0)}), inQuotes: ${inQuotes}, braceCount: ${braceCount}`);
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