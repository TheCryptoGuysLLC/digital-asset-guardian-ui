exports.handler = async (event, context) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const url = "https://script.google.com/macros/s/AKfycbz273eq-2tvp0Pv-n9t5mBiisTcvjYmsjA-TyTfdS57D2nLMdohIgmCB_WXQptlXFpv/exec?email=testuser@example.com&tier=pro";
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const html = await response.text();

    // Extract JSON string from goog.script.init
    const initStart = html.indexOf('goog.script.init("') + 'goog.script.init("'.length;
    const initEnd = html.indexOf('", "", undefined, true , false  , "false",');
    if (initStart === -1 || initEnd === -1) throw new Error("No JSON string found in goog.script.init");
    const jsonStringEscaped = html.substring(initStart, initEnd);

    // Decode escaped string—minimal unescaping to preserve valid JSON
    const jsonString = jsonStringEscaped
      .replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))) // Hex escapes
      .replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))) // Unicode
      .replace(/\\\\/g, '\\') // Double backslashes to single
      .replace(/\\"/g, '"')   // Escaped quotes
      .replace(/\\n/g, '\n'); // Newlines—leave | as-is

    // Parse the outer JSON
    let data;
    try {
      data = JSON.parse(jsonString);
      // Extract and parse the nested userHtml JSON
      if (data.userHtml) {
        data = JSON.parse(data.userHtml);
      }
    } catch (parseError) {
      throw new Error(`JSON parsing failed: ${parseError.message}\nRaw string: ${jsonString}`);
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