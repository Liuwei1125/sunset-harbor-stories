"use strict";
(() => {
  const records = window.MODEL_CATALOG;
  const search = document.querySelector("#model-search");
  const selectors = { cost: document.querySelector("#model-cost"), style: document.querySelector("#model-style"), cockpit: document.querySelector("#model-cockpit") };
  const rows = [...document.querySelectorAll("#model-rows tr")];
  const matches = (record, query, filters) => {
    const haystack = Object.values(record).join(" ").toLocaleLowerCase();
    return (!query || haystack.includes(query)) && Object.entries(filters).every(([key, value]) => value === "all" || record[key] === value);
  };
  const update = () => {
    const query = search.value.trim().toLocaleLowerCase();
    const filters = Object.fromEntries(Object.entries(selectors).map(([key, node]) => [key, node.value]));
    let visible = 0;
    records.forEach((record, index) => {
      const show = matches(record, query, filters);
      rows[index].hidden = !show;
      if (show) visible++;
    });
    document.querySelector("#model-count").textContent = `显示 ${visible} / ${records.length} 项`;
    document.querySelector("#model-empty").hidden = visible !== 0;
  };
  search.addEventListener("input", update);
  Object.values(selectors).forEach(node => node.addEventListener("change", update));
  document.querySelector("#model-reset").addEventListener("click", () => {
    search.value = "";
    Object.values(selectors).forEach(node => { node.value = "all"; });
    update();
  });
  document.querySelector("#print-report").addEventListener("click", () => window.print());
  update();
})();
