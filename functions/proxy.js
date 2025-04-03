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

    // Find the nested userHtml directly
    const dataStart = html.indexOf('var data = {"userHtml":"');
    if (dataStart === -1) throw new Error("No 'var data = {\"userHtml\":\"' found in response");
    console.log("Data start index:", dataStart);

    const nestedQuote = html.indexOf('"', dataStart + 23); // After 'var data = {"userHtml":"'
    if (nestedQuote === -1) throw new Error("No quote found after nested userHtml");
    console.log("Nested quote index:", nestedQuote);

    let start = html.indexOf('{', nestedQuote);
    if (start === -1) {
      console.log("No { found - raw snippet:", html.substring(nestedQuote, nestedQuote + 50));
      const decodedHtml = html.substring(nestedQuote).replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      const braceIndex = decodedHtml.indexOf('{');
      if (braceIndex === -1) {
        console.log("No decoded { found - decoded snippet:", decodedHtml.substring(0, 50));
        throw new Error("Opening brace not found after nested userHtml");
      }
      start = nestedQuote + braceIndex;
    }
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