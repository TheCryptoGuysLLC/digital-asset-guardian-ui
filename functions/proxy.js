exports.handler = async (event, context) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const url = "https://script.google.com/macros/s/AKfycbz273eq-2tvp0Pv-n9t5mBiisTcvjYmsjA-TyTfdS57D2nLMdohIgmCB_WXQptlXFpv/exec?email=testuser@example.com&tier=pro";
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const html = await response.text();

    // Log raw response for debugging
    console.log("Raw response from v4:", html);

    // Try extracting userHtml first
    let jsonString;
    const userHtmlStart = html.indexOf('"userHtml":"') + '"userHtml":"'.length;
    const userHtmlEnd = html.indexOf('","ncc"');
    if (userHtmlStart !== -1 && userHtmlEnd !== -1) {
      jsonString = html.substring(userHtmlStart, userHtmlEnd);
    } else {
      // Fallback: find any JSON starting with {"portfolio":
      const jsonStart = html.indexOf('{"portfolio":');
      const jsonEnd = html.lastIndexOf('}') + 1;
      if (jsonStart !== -1 && jsonEnd !== -1) {
        jsonString = html.substring(jsonStart, jsonEnd);
      } else {
        throw new Error("No JSON-like data found in response");
      }
    }

    // Log extracted JSON string
    console.log("Extracted JSON string:", jsonString);

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