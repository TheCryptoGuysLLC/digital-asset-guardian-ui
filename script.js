async function fetchPortfolio() {
  const url = "https://script.google.com/macros/s/AKfycbz273eq-2tvp0Pv-n9t5mBiisTcvjYmsjA-TyTfdS57D2nLMdohIgmCB_WXQptlXFpv/exec?email=testuser@example.com&tier=pro";
  try {
    const response = await fetch(url);
    const html = await response.text();
    // Strip HTML wrapper
    const jsonStart = html.indexOf("{");
    const jsonEnd = html.lastIndexOf("}") + 1;
    const jsonString = html.slice(jsonStart, jsonEnd);
    const data = JSON.parse(jsonString);

    // Display portfolio
    const portfolioDiv = document.getElementById("portfolio");
    let htmlContent = "<h2>Portfolio</h2>";
    htmlContent += "<table><tr><th>Asset</th><th>Balance</th></tr>";
    for (const [key, value] of Object.entries(data.portfolio.balances)) {
      htmlContent += `<tr><td>${key}</td><td>${value}</td></tr>`;
    }
    htmlContent += `<tr><td>Total Value</td><td>${data.portfolio.totalValue}</td></tr>`;
    htmlContent += "</table>";
    portfolioDiv.innerHTML = htmlContent;
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    document.getElementById("portfolio").innerHTML = "Error loading portfolio data.";
  }
}

fetchPortfolio();