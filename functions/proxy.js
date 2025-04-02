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
        "Host": "script.google.com"
      }
    });
    if (!response.ok) throw new Error(`Fetch failed: ${response.status} - ${response.statusText}`);
    const html = await response.text();

    // Log full raw response and headers for debugging
    console.log("Full raw response from v4:", html);
    console.log("Response headers:", JSON.stringify([...response.headers]));

    // Extract userHtml JSON string—flexible end marker
    let jsonString;
    const userHtmlStart = html.indexOf('"userHtml":"');
    if (userHtmlStart !== -1) {
      const start = userHtmlStart + '"userHtml":"'.length;
      const nextQuote = html.indexOf('"', start);
      if (nextQuote !== -1 && nextQuote > start) {
        jsonString = html.substring(start, nextQuote);
        console.log("Extracted userHtml JSON:", jsonString);
      } else {
        console.log("userHtml start found but no valid end - start:", userHtmlStart, "next quote:", nextQuote);
      }
    }

    // Fallback: raw JSON like March 31
    if (!jsonString) {
      const jsonStart = html.indexOf('{"portfolio":');
      const jsonEnd = html.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonString = html.substring(jsonStart, jsonEnd + 1);
        console.log("Extracted raw portfolio JSON:", jsonString);
      } else {
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
    } catch (parseError) {
      throw new Error(`JSON parsing failed: ${parseError.message}\nDecoded string: ${decodedJson}`);
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