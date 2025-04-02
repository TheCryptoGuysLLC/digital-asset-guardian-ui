async function fetchPortfolio() {
  const url = "/.netlify/functions/proxy"; // Netlify function endpoint
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    console.log("Parsed data:", data);

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