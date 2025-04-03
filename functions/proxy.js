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
    console.log("Response length:", html.length);

    // Extract userHtml JSON string—anchor to 'userHtml'
    let jsonString;
    const userHtmlAny = html.indexOf('userHtml');
    console.log("Any 'userHtml' occurrence:", userHtmlAny);
    if (userHtmlAny !== -1) {
      const snippetStart = Math.max(0, userHtmlAny - 20);
      const snippetEnd = Math.min(html.length, userHtmlAny + 100);
      const snippet = html.substring(snippetStart, snippetEnd);
      console.log("Extended snippet around 'userHtml':", snippet);
      const userHtmlMarker = '"userHtml":"';
      const markerOffset = snippet.indexOf(userHtmlMarker);
      console.log("Marker offset in snippet:", markerOffset);
      const startBase = snippetStart + (markerOffset !== -1 ? markerOffset + userHtmlMarker.length : 34);
      const start = startBase + 1; // Skip \x22, start at \x7b (2421)
      console.log("Adjusted start position to skip quote:", start);
      // Find the end of the JSON object (first balanced })
      let end = start;
      let braceCount = 0;
      let inQuotes = false;
      for (let i = start; i < html.length; i++) {
        const char = html[i];
        console.log(`Char at ${i}: ${char}, inQuotes: ${inQuotes}, braceCount: ${braceCount}`);
        if (char === '"' && (i === 0 || html[i - 1] !== '\\')) {
          inQuotes = !inQuotes;
          console.log(`Quote toggle at ${i}: inQuotes = ${inQuotes}`);
        }
        if (!inQuotes) {
          if (char === '{') {
            braceCount++;
            console.log(`Open brace at ${i}: braceCount = ${braceCount}`);
          } else if (char === '}') {
            braceCount--;
            console.log(`Close brace at ${i}: braceCount = ${braceCount}`);
            if (braceCount === 0) {
              end = i + 1; // Include the closing brace
              break;
            }
          }
        }
      }
      console.log("Start position:", start, "End position:", end);
      if (end > start) {
        jsonString = html.substring(start, end);
        console.log("Extracted userHtml JSON (raw):", jsonString);
        // Decode escaped string—handle all escapes properly
        const decodedJson = jsonString
          .replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
          .replace(/\\"/g, '"')
          .replace(/\\n/g, '\n')
          .replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
          .replace(/^[^[{]+/, '');
        console.log("Decoded JSON:", decodedJson);
        // Parse the JSON
        let data;
        try {
          data = JSON.parse(decodedJson);
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
        } catch (parseError) {
          console.log("JSON parsing failed - decoded string:", decodedJson);
          throw new Error(`JSON parsing failed: ${parseError.message}`);
        }
      } else {
        console.log("No valid end marker - start:", start, "end:", end);
        throw new Error("Failed to extract userHtml JSON - no valid end marker");
      }
    } else {
      // Fallback: raw JSON like March 31
      const jsonStart = html.indexOf('{"portfolio":');
      const jsonEnd = html.lastIndexOf('}');
      console.log("Fallback search - portfolio start:", jsonStart, "portfolio end:", jsonEnd);
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonString = html.substring(jsonStart, jsonEnd + 1);
        console.log("Extracted raw portfolio JSON:", jsonString);
      } else {
        console.log("No JSON patterns matched - userHtml any:", userHtmlAny, "portfolio start:", jsonStart, "portfolio end:", jsonEnd);
        throw new Error("No userHtml or portfolio JSON found in response");
      }
      // Decode and parse fallback
      const decodedJson = jsonString
        .replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      let data;
      try {
        data = JSON.parse(decodedJson);
        delete data.gasPrices;
        console.log("Parsed JSON data (fallback):", JSON.stringify(data));
        return {
          statusCode: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(data)
        };
      } catch (parseError) {
        console.log("JSON parsing failed (fallback) - decoded string:", decodedJson);
        throw new Error(`JSON parsing failed: ${parseError.message}`);
      }
    }
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