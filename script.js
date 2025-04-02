async function fetchPortfolio() {
  const url = "https://script.google.com/macros/s/AKfycbz273eq-2tvp0Pv-n9t5mBiisTcvjYmsjA-TyTfdS57D2nLMdohIgmCB_WXQptlXFpv/exec?email=testuser@example.com&tier=pro";
  try {
    const response = await fetch(url, { mode: "cors" }); // Add CORS mode
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const html = await response.text();
    console.log("Raw response:", html); // Log raw output

    // Strip HTML wrapper
    const jsonStart = html.indexOf("{");
    const jsonEnd = html.lastIndexOf("}") + 1;
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found in response");
    const jsonString = html.slice(jsonStart, jsonEnd);
    console.log("Extracted JSON:", jsonString); // Log extracted JSON

    const data = JSON.parse(jsonString);
    console.log("Parsed data:", data); // Log parsed data

    // Display portfolio
    const portfolioDiv = document.getElementById("portfolio");
    let htmlContent = "<h2>Portfolio</h2>";
    htmlContent += "<table><tr><th>Asset</th><th>Balance</th></tr>";
    for (const [key, value] of Object.entries(data.portfolio.balances)) {
      htmlContent += `<tr><td>${key}</td><td>${value}</td></tr>`;
    }
    htmlContent += `<tr><td><strong>Total Value</strong></td><td><strong>${data.portfolio.totalValue}</strong></td></tr>`;
    htmlContent += "</table>";
    portfolioDiv.innerHTML = htmlContent;
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    document.getElementById("portfolio").innerHTML = "Error loading portfolio data: " + error.message;
  }
}

fetchPortfolio();