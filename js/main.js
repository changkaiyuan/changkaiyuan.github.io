// main.js

const width = 900, height = 500;
const svg = d3.select("#scene").append("svg")
  .attr("width", width)
  .attr("height", height);

let data = [];
let selectedYear = 2023;

const excludedRegions = ["World", "EU 27"];

function showScene(index) {
  svg.selectAll("*").remove();
  d3.select("#description").html("");
  d3.select("#year-selector").style("display", index === 0 ? "none" : "inline-block");

  if (index === 0) drawGlobalTrend();
  else if (index === 1) drawCountryBarChart();
  else if (index === 2) drawInteractiveScatter();
}

d3.csv("data/IEA-EV-dataEV salesHistoricalCars.csv").then(raw => {
  data = raw.filter(d => d.parameter === "EV sales" && d.unit === "Vehicles");
  showScene(0);

  // Move these inside to ensure DOM exists
  d3.select("#year-selector").on("change", function () {
    selectedYear = +this.value;
    const currentScene = document.querySelector(".controls .active")?.getAttribute("data-scene") || "0";
    showScene(+currentScene);
  });

  d3.selectAll(".controls button").on("click", function () {
    d3.selectAll(".controls button").classed("active", false);
    d3.select(this).classed("active", true);
    const index = +d3.select(this).attr("data-scene");
    showScene(index);
  });
});

function drawGlobalTrend() {
  const worldData = data.filter(d => d.region === "World").map(d => ({
    year: +d.year,
    total: +d.value
  })).sort((a, b) => a.year - b.year);

  const x = d3.scaleLinear().domain(d3.extent(worldData, d => d.year)).range([60, width - 40]);
  const y = d3.scaleLinear().domain([0, d3.max(worldData, d => d.total)]).range([height - 40, 40]);

  svg.append("g").attr("transform", `translate(0,${height - 40})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
  svg.append("g").attr("transform", `translate(60,0)`).call(d3.axisLeft(y));

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.total));

  svg.append("path")
    .datum(worldData)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2)
    .attr("d", line);

  svg.selectAll("circle")
    .data(worldData)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.year))
    .attr("cy", d => y(d.total))
    .attr("r", 4)
    .attr("fill", "darkorange")
    .append("title").text(d => `${d.year}: ${Math.round(d.total).toLocaleString()} EVs`);

  // Annotation at 2020
  const growthYear = worldData.find(d => d.year === 2020);
  svg.append("line")
    .attr("x1", x(2020)).attr("x2", x(2020))
    .attr("y1", y(0)).attr("y2", y(growthYear.total))
    .attr("stroke", "gray").attr("stroke-dasharray", "4 2");

  svg.append("text")
    .attr("x", x(2020) + 5)
    .attr("y", y(growthYear.total) - 10)
    .text("Rapid growth begins (2020)")
    .attr("fill", "gray")
    .attr("font-size", "13px");

  svg.append("text")
    .attr("x", width / 2).attr("y", 30)
    .attr("text-anchor", "middle")
    .attr("class", "scene-title")
    .text("Global EV Sales Over Time (2010–2024)");

  d3.select("#description").html(`This chart shows the global rise of EV sales over time. Sales begin to surge rapidly starting in <strong>2020</strong>.`);
}

function drawCountryBarChart() {
  const filtered = data.filter(d => +d.year === selectedYear && !excludedRegions.includes(d.region));
  const grouped = d3.rollup(filtered, v => d3.sum(v, d => +d.value), d => d.region);
  const entries = Array.from(grouped, ([country, sales]) => ({ country, sales }))
    .sort((a, b) => d3.descending(a.sales, b.sales)).slice(0, 15);

  const x = d3.scaleLinear().domain([0, d3.max(entries, d => d.sales)]).range([60, width - 20]);
  const y = d3.scaleBand().domain(entries.map(d => d.country)).range([60, height - 40]).padding(0.1);

  svg.append("g").attr("transform", `translate(0,${height - 40})`).call(d3.axisBottom(x));
  svg.append("g").attr("transform", `translate(60,0)`).call(d3.axisLeft(y));

  svg.selectAll("rect")
    .data(entries)
    .enter()
    .append("rect")
    .attr("x", x(0))
    .attr("y", d => y(d.country))
    .attr("width", d => x(d.sales) - 60)
    .attr("height", y.bandwidth())
    .attr("fill", "teal")
    .append("title").text(d => `${d.country}: ${Math.round(d.sales).toLocaleString()} EVs`);

  svg.append("text")
    .attr("x", width / 2).attr("y", 30)
    .attr("text-anchor", "middle")
    .attr("class", "scene-title")
    .text(`Top 15 Countries by EV Sales in ${selectedYear}`);

  d3.select("#description").html(`This bar chart displays the top 15 countries in EV sales in <strong>${selectedYear}</strong>. It allows you to explore how countries compare.`);
}

function drawInteractiveScatter() {
  const filtered = data.filter(d => +d.year === selectedYear && !excludedRegions.includes(d.region));
  const grouped = d3.rollup(filtered, v => d3.sum(v, d => +d.value), d => d.region);
  const entries = Array.from(grouped, ([region, value]) => ({ region, value }));

  const x = d3.scaleBand().domain(entries.map(d => d.region)).range([60, width - 40]).padding(0.2);
  const y = d3.scaleLinear().domain([0, d3.max(entries, d => d.value)]).range([height - 40, 60]);

  svg.append("g").attr("transform", `translate(0,${height - 40})`).call(d3.axisBottom(x)).selectAll("text")
    .attr("transform", "rotate(-45)").style("text-anchor", "end");
  svg.append("g").attr("transform", `translate(60,0)