const width = 900, height = 500;
const svg = d3.select("#scene").append("svg")
  .attr("width", width)
  .attr("height", height);

let data = [];
let selectedYear = 2023;
const excludedRegions = ["World", "EU27", "Europe", "Rest of the world"];

d3.csv("data/IEA-EV-dataEV salesHistoricalCars.csv").then(raw => {
  data = raw.filter(d => d.parameter === "EV sales" && d.unit === "Vehicles");
  setupControls();
  showScene(0);
});

function setupControls() {
  d3.selectAll(".controls button").on("click", function () {
    d3.selectAll(".controls button").classed("active", false);
    d3.select(this).classed("active", true);
    const index = +this.getAttribute("data-scene");
    showScene(index);
  });

  d3.select("#year-selector").on("change", function () {
    selectedYear = +this.value;
    const currentScene = +document.querySelector(".controls button.active").getAttribute("data-scene");
    showScene(currentScene);
  });
}

function showScene(index) {
  svg.selectAll("*").remove();
  d3.select("#description").html("");

  d3.select("#year-selector").style("display", index === 0 ? "none" : "inline-block");

  if (index === 0) drawGlobalTrend();
  else if (index === 1) drawCountryBarChart();
  else drawInteractiveScatter();
}

function drawGlobalTrend() {
  const worldData = Array.from(
    d3.rollup(
      data.filter(d => d.region === "World"),
      v => d3.sum(v, d => +d.value),
      d => +d.year
    ),
    ([year, total]) => ({ year, total })
  ).sort((a, b) => a.year - b.year);
  const x = d3.scaleLinear().domain(d3.extent(worldData, d => d.year)).range([60, width - 40]);
  const y = d3.scaleLinear().domain([0, d3.max(worldData, d => d.total)]).range([height - 40, 40]);

  svg.append("g").attr("transform", `translate(0,${height - 40})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
  svg.append("g").attr("transform", `translate(60,0)`).call(d3.axisLeft(y));

  const line = d3.line().x(d => x(d.year)).y(d => y(d.total));
  svg.append("path").datum(worldData)
    .attr("fill", "none").attr("stroke", "steelblue").attr("stroke-width", 2).attr("d", line);

  svg.selectAll("circle").data(worldData).enter().append("circle")
    .attr("cx", d => x(d.year)).attr("cy", d => y(d.total)).attr("r", 4).attr("fill", "orange");

  // Rapid Growth
  const growth = worldData.find(d => d.year === 2020);
  svg.append("line")
    .attr("x1", x(2020)).attr("x2", x(2020)).attr("y1", y(0)).attr("y2", y(growth.total))
    .attr("stroke", "gray").attr("stroke-dasharray", "4 2");

  svg.append("text")
    .attr("x", x(2020) + 6).attr("y", y(growth.total) - 10)
    .text("Rapid growth begins (2020)")
    .attr("fill", "gray").attr("font-size", "13px");

  svg.append("text")
    .attr("x", width / 2).attr("y", 30).attr("text-anchor", "middle")
    .text("Global EV Sales Over Time (2010–2024)");

  d3.select("#description").html(`EV sales grew slowly until <strong>2020</strong>, then surged globally in the following years.`);
}

function drawCountryBarChart() {
  const filtered = data.filter(d => +d.year === selectedYear && !excludedRegions.includes(d.region));
  const grouped = d3.rollup(filtered, v => d3.sum(v, d => +d.value), d => d.region);
  const entries = Array.from(grouped, ([country, value]) => ({ country, value }))
    .sort((a, b) => d3.descending(a.value, b.value)).slice(0, 15);

  const x = d3.scaleLinear().domain([0, d3.max(entries, d => d.value)]).range([60, width - 40]);
  const y = d3.scaleBand().domain(entries.map(d => d.country)).range([60, height - 40]).padding(0.1);

  svg.append("g").attr("transform", `translate(0,${height - 40})`).call(d3.axisBottom(x));
  svg.append("g").attr("transform", `translate(60,0)`).call(d3.axisLeft(y));

  svg.selectAll("rect").data(entries).enter().append("rect")
    .attr("x", 60).attr("y", d => y(d.country))
    .attr("width", d => x(d.value) - 60).attr("height", y.bandwidth())
    .attr("fill", "teal");

  svg.append("text")
    .attr("x", width / 2).attr("y", 30).attr("text-anchor", "middle")
    .text(`Top 15 Countries in ${selectedYear}`);

  d3.select("#description").html(`These are the top 15 countries in <strong>${selectedYear}</strong> ranked by EV sales.`);
}

function drawInteractiveScatter() {
  const filtered = data.filter(d => +d.year === selectedYear && !excludedRegions.includes(d.region));
  const grouped = d3.rollup(filtered, v => d3.sum(v, d => +d.value), d => d.region);
  const entries = Array.from(grouped, ([country, value]) => ({ country, value }));

  const x = d3.scaleBand().domain(entries.map(d => d.country)).range([60, width - 40]).padding(0.3);
  const y = d3.scaleLinear().domain([0, d3.max(entries, d => d.value)]).range([height - 40, 60]);

  svg.append("g").attr("transform", `translate(0,${height - 40})`).call(d3.axisBottom(x)).selectAll("text")
    .attr("transform", "rotate(-45)").style("text-anchor", "end");
  svg.append("g").attr("transform", `translate(60,0)`).call(d3.axisLeft(y));

  const tooltip = d3.select("#tooltip");

  svg.selectAll("circle").data(entries).enter().append("circle")
    .attr("cx", d => x(d.country) + x.bandwidth() / 2)
    .attr("cy", d => y(d.value)).attr("r", 6).attr("fill", "tomato")
    .on("mouseover", (event, d) => {
      tooltip.style("display", "block")
        .html(`<strong>${d.country}</strong><br>${Math.round(d.value).toLocaleString()} EVs`);
    })
    .on("mousemove", event => {
      tooltip.style("left", (event.pageX + 10) + "px")
             .style("top", (event.pageY - 30) + "px");
    })
    .on("mouseout", () => tooltip.style("display", "none"));

  svg.append("text")
    .attr("x", width / 2).attr("y", 30).attr("text-anchor", "middle")
    .text(`Explore ${selectedYear} EV Sales by Country`);

  d3.select("#description").html(`Hover over each dot to explore EV sales in <strong>${selectedYear}</strong> by country.`);
}