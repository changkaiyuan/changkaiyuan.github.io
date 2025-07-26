let data, svg;
let currentScene = 0;
let selectedYear = "2023";
const width = 900, height = 500;

const sceneDescriptions = [
  "Electric vehicles have steadily gained momentum from 2010 to <strong class='highlight'>2024</strong>, with a noticeable surge starting in <strong class='highlight'>2020</strong>. Explore how global sales evolved.",
  "Which countries are leading the EV market in <strong class='highlight'>{year}</strong>? See top 15 by total units sold.",
  "Click and explore the distribution of EV sales by country in <strong class='highlight'>{year}</strong>. Hover for details."
];

function onYearChange(year) {
  selectedYear = year;
  showScene(currentScene);
}

function showScene(index) {
  currentScene = index;
  d3.select("#scene").html("");

  // Toggle year dropdown visibility
  const yearSelector = d3.select("#yearSelect");
  if (index === 0) {
    yearSelector.style("display", "none");
  } else {
    yearSelector.style("display", "inline-block");
  }

  d3.select("#description").html(
    sceneDescriptions[index].replaceAll("{year}", `<strong class='highlight'>${selectedYear}</strong>`)
  );

  svg = d3.select("#scene").append("svg")
    .attr("width", width).attr("height", height);

  if (index === 0) drawGlobalTrend();
  else if (index === 1) drawCountryBarChart();
  else if (index === 2) drawInteractiveScatter();
}

d3.csv("data/IEA-EV-dataEV salesHistoricalCars.csv").then(raw => {
  data = raw.filter(d => d.parameter === "EV sales" && d.unit === "Vehicles");
  showScene(0);
});

function drawGlobalTrend() {
  const worldData = data.filter(d => d.region === "World")
    .map(d => ({ year: +d.year, total: +d.value }))
    .sort((a, b) => a.year - b.year);

  const x = d3.scaleLinear().domain(d3.extent(worldData, d => d.year)).range([60, width - 40]);
  const y = d3.scaleLinear().domain([0, d3.max(worldData, d => d.total)]).range([height - 40, 40]);

  svg.append("g").attr("transform", `translate(0,${height - 40})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
  svg.append("g").attr("transform", `translate(60,0)`).call(d3.axisLeft(y));

  const line = d3.line().x(d => x(d.year)).y(d => y(d.total));
  svg.append("path")
    .datum(worldData)
    .attr("fill", "none").attr("stroke", "steelblue").attr("stroke-width", 2)
    .attr("d", line);

  svg.selectAll("circle")
    .data(worldData)
    .enter().append("circle")
    .attr("cx", d => x(d.year)).attr("cy", d => y(d.total)).attr("r", 4)
    .attr("fill", "orange")
    .append("title").text(d => `${d.year}: ${Math.round(d.total).toLocaleString()} EVs`);

  svg.append("text")
    .attr("x", width / 2).attr("y", 30).attr("text-anchor", "middle")
    .attr("class", "scene-title")
    .text("Global EV Sales Over Time (2010–2024)");

  // Annotation: Start of rapid growth
  svg.append("line")
    .attr("x1", x(2020)).attr("x2", x(2020)).attr("y1", 40).attr("y2", height - 40)
    .attr("stroke", "gray").attr("stroke-dasharray", "4");

  svg.append("text")
    .attr("x", x(2020) + 5).attr("y", 60)
    .attr("class", "annotation")
    .text("Rapid growth begins (2020)");
}

function drawCountryBarChart() {
  const filtered = data.filter(d => +d.year === +selectedYear && d.region !== "World");
  const grouped = d3.rollup(filtered, v => d3.sum(v, d => +d.value), d => d.region);
  const entries = Array.from(grouped, ([country, sales]) => ({ country, sales }))
    .sort((a, b) => d3.descending(a.sales, b.sales)).slice(0, 15);

  const x = d3.scaleLinear().domain([0, d3.max(entries, d => d.sales)]).range([60, width - 20]);
  const y = d3.scaleBand().domain(entries.map(d => d.country)).range([60, height - 40]).padding(0.1);

  svg.append("g").attr("transform", `translate(0,${height - 40})`).call(d3.axisBottom(x));
  svg.append("g").attr("transform", `translate(60,0)`).call(d3.axisLeft(y));

  svg.selectAll("rect")
    .data(entries)
    .enter().append("rect")
    .attr("x", x(0)).attr("y", d => y(d.country))
    .attr("width", d => x(d.sales) - 60).attr("height", y.bandwidth())
    .attr("fill", "teal")
    .append("title").text(d => `${d.country}: ${Math.round(d.sales).toLocaleString()} EVs`);

  svg.append("text")
    .attr("x", width / 2).attr("y", 30).attr("text-anchor", "middle")
    .attr("class", "scene-title")
    .text(`Top 15 Countries by EV Sales in ${selectedYear}`);
}

function drawInteractiveScatter() {
  const filtered = data.filter(d => +d.year === +selectedYear && d.region !== "World");
  const grouped = d3.rollup(filtered, v => d3.sum(v, d => +d.value), d => d.region);
  const entries = Array.from(grouped, ([region, value]) => ({ region, value }));

  const x = d3.scaleBand().domain(entries.map(d => d.region)).range([60, width - 40]).padding(0.2);
  const y = d3.scaleLinear().domain([0, d3.max(entries, d => d.value)]).range([height - 40, 60]);

  svg.append("g").attr("transform", `translate(0,${height - 40})`).call(d3.axisBottom(x)).selectAll("text")
    .attr("transform", "rotate(-45)").style("text-anchor", "end");
  svg.append("g").attr("transform", `translate(60,0)`).call(d3.axisLeft(y));

  svg.selectAll("circle")
    .data(entries)
    .enter().append("circle")
    .attr("cx", d => x(d.region) + x.bandwidth() / 2)
    .attr("cy", d => y(d.value)).attr("r", 6).attr("fill", "tomato")
    .append("title").text(d => `${d.region}: ${Math.round(d.value).toLocaleString()} EVs`);

  svg.append("text")
    .attr("x", width / 2).attr("y", 30).attr("text-anchor", "middle")
    .attr("class", "scene-title")
    .text(`Explore EV Sales by Country (${selectedYear})`);
}