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
    const html = await response.text();

    // Log full raw response and headers for debugging
    console.log("Full raw response from v4:", html);
    console.log("Response headers:", JSON.stringify([...response.headers]));
    console.log("Response length:", html.length); // Debug string length

    // Extract userHtml JSON string—exact marker from logs
    let jsonString;
    const userHtmlMarker = '"userHtml":"'; // Exact string from logs
    const userHtmlStart = html.indexOf(userHtmlMarker);
    console.log("userHtmlMarker search result - start:", userHtmlStart); // Debug marker position
    if (userHtmlStart !== -1) {
      const start = userHtmlStart + userHtmlMarker.length;
      const nextQuote = html.indexOf('"', start);
      console.log("Next quote position:", nextQuote); // Debug end marker
      if (nextQuote !== -1 && nextQuote > start) {
        jsonString = html.substring(start, nextQuote);
        console.log("Extracted userHtml JSON:", jsonString);
      } else {
        console.log("userHtml start found but no valid end - start:", userHtmlStart, "next quote:", nextQuote);
        throw new Error("Failed to extract userHtml JSON - no valid end marker");
      }
    } else {
      // Fallback: raw JSON like March 31
      const jsonStart = html.indexOf('{"portfolio":');
      const jsonEnd = html.lastIndexOf('}');
      console.log("Fallback search - portfolio start:", jsonStart, "portfolio end:", jsonEnd); // Debug fallback
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonString = html.substring(jsonStart, jsonEnd + 1);
        console.log("Extracted raw portfolio JSON:", jsonString);
      } else {
        // Additional debug: check substrings around 'userHtml'
        const userHtmlAny = html.indexOf('userHtml');
        console.log("Any 'userHtml' occurrence:", userHtmlAny);
        if (userHtmlAny !== -1) {
          const snippetStart = Math.max(0, userHtmlAny - 20);
          const snippetEnd = Math.min(html.length, userHtmlAny + 20);
          console.log("Snippet around 'userHtml':", html.substring(snippetStart, snippetEnd));
        }
        console.log("No JSON patterns matched - userHtml start:", userHtmlStart, "portfolio start:", jsonStart, "portfolio end:", jsonEnd);
        throw new Error("No userHtml or portfolio JSON found in response");
      }
    }

    // Decode escaped string—minimal unescaping
    const decodedJson = jsonString
      .replace(/\\"/g, '"')   // Escaped quotes
      .replace(/\\n/g, '\n')  // Newlines
      .replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))); // Unicode

    // Parse the JSON
    let data;
    try {
      data = JSON.parse(decodedJson);
      delete data.gasPrices; // Remove gasPrices as agreed
      console.log("Parsed JSON data:", JSON.stringify(data)); // Debug parsed output
    } catch (parseError) {
      console.log("JSON parsing failed - decoded string:", decodedJson);
      throw new Error(`JSON parsing failed: ${parseError.message}`);
    }

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