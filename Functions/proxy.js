const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const url = "https://script.google.com/macros/s/AKfycbz273eq-2tvp0Pv-n9t5mBiisTcvjYmsjA-TyTfdS57D2nLMdohIgmCB_WXQptlXFpv/exec?email=testuser@example.com&tier=pro";
  try {
    const response = await fetch(url);
    const html = await response.text();
    const jsonStart = html.indexOf("{");
    const jsonEnd = html.lastIndexOf("}") + 1;
    const jsonString = html.slice(jsonStart, jsonEnd);
    const data = JSON.parse(jsonString);

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
      body: JSON.stringify({ error: error.message })
    };
  }
};