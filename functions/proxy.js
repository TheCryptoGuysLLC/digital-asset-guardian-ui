exports.handler = async (event, context) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const url = "https://script.google.com/macros/s/AKfycbz273eq-2tvp0Pv-n9t5mBiisTcvjYmsjA-TyTfdS57D2nLMdohIgmCB_WXQptlXFpv/exec?email=testuser@example.com&tier=pro";
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const html = await response.text();

    // Find the JSON string inside goog.script.init
    const initStart = html.indexOf('goog.script.init("') + 'goog.script.init("'.length;
    const initEnd = html.indexOf('", "", undefined, true , false  , "false",');
    if (initStart === -1 || initEnd === -1) throw new Error("No JSON string found in goog.script.init");
    const jsonStringEscaped = html.substring(initStart, initEnd);

    // Decode escaped string (e.g., \x22 -> ")
    const jsonString = jsonStringEscaped
      .replace(/\\x22/g, '"')  // Unescape quotes
      .replace(/\\x5b/g, '[')  // Unescape [
      .replace(/\\x5d/g, ']')  // Unescape ]
      .replace(/\\x7b/g, '{')  // Unescape {
      .replace(/\\x7d/g, '}')  // Unescape }
      .replace(/\\\\/g, '\\'); // Unescape backslashes

    // Parse the JSON
    let data;
    try {
      data = JSON.parse(jsonString);
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