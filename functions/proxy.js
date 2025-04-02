exports.handler = async (event, context) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const url = "https://script.google.com/macros/s/AKfycbz273eq-2tvp0Pv-n9t5mBiisTcvjYmsjA-TyTfdS57D2nLMdohIgmCB_WXQptlXFpv/exec?email=testuser@example.com&tier=pro";
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const html = await response.text();

    // Extract JSON from HTML
    const jsonStart = html.indexOf("{");
    const jsonEnd = html.lastIndexOf("}") + 1;
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("No valid JSON found in response");
    const jsonString = html.substring(jsonStart, jsonEnd);

    // Validate and parse JSON
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