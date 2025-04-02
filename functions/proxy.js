exports.handler = async (event, context) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const url = "https://script.google.com/macros/s/AKfycbz273eq-2tvp0Pv-n9t5mBiisTcvjYmsjA-TyTfdS57D2nLMdohIgmCB_WXQptlXFpv/exec?email=testuser@example.com&tier=pro";
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const html = await response.text();

    // Log raw response for debugging
    console.log("Raw response from v4:", html);

    // Broad search for any JSON-like string
    const jsonPatterns = [
      { start: '"userHtml":"', end: '","ncc"' },
      { start: '{"portfolio":', end: '}' },
      { start: '{', end: '}' } // Widest net
    ];
    let jsonString;
    for (const pattern of jsonPatterns) {
      const startIdx = html.indexOf(pattern.start);
      const endIdx = html.lastIndexOf(pattern.end) + pattern.end.length;
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        jsonString = html.substring(startIdx + (pattern.start === '{' ? 0 : pattern.start.length), endIdx - (pattern.end === '}' ? 0 : pattern.end.length));
        console.log("Extracted JSON string with pattern", pattern.start, ":", jsonString);
        break;
      }
    }
    if (!jsonString) throw new Error("No JSON-like data found in response");

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