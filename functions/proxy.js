exports.handler = async (event, context) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const url = "https://script.google.com/macros/s/AKfycbz273eq-2tvp0Pv-n9t5mBiisTcvjYmsjA-TyTfdS57D2nLMdohIgmCB_WXQptlXFpv/exec?email=testuser@example.com&tier=pro";
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124",
        "Accept": "application/json, text/html, */*"
      }
    });
    if (!response.ok) throw new Error(`Fetch failed: ${response.status} - ${response.statusText}`);
    const html = await response.text();

    // Log full raw response and headers for debugging
    console.log("Full raw response from v4:", html);
    console.log("Response headers:", JSON.stringify([...response.headers]));

    // Extract userHtml JSON string precisely
    const userHtmlStart = html.indexOf('"userHtml":"') + '"userHtml":"'.length;
    const userHtmlEnd = html.indexOf('","ncc"');
    if (userHtmlStart === -1 || userHtmlEnd === -1) {
      console.log("userHtml markers not found - start:", userHtmlStart, "end:", userHtmlEnd);
      // Fallback: extract any JSON-like string
      const jsonStart = html.indexOf('{"portfolio":');
      const jsonEnd = html.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const jsonString = html.substring(jsonStart, jsonEnd + 1);
        console.log("Extracted portfolio JSON:", jsonString);
        const data = JSON.parse(jsonString);
        delete data.gasPrices; // Remove gasPrices as agreed
        return {
          statusCode: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(data)
        };
      }
      throw new Error("No userHtml or portfolio JSON found in response");
    }
    const jsonStringEscaped = html.substring(userHtmlStart, userHtmlEnd);

    // Log extracted JSON string
    console.log("Extracted userHtml JSON:", jsonStringEscaped);

    // Decode escaped string—minimal unescaping
    const decodedJson = jsonStringEscaped
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