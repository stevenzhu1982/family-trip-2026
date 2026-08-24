(() => {
  const configs = {
    spring: { name: "春秋航空", endpoint: "/api/flight-prices?airline=spring" },
    thai: { name: "泰国航空", endpoint: "/api/flight-prices?airline=thai" },
    all: { name: "全航司直飞（BKK）", endpoint: "/api/flight-prices?airline=all" }
  };

  const airline = document.body.dataset.airline;
  const config = configs[airline];
  const resultRoot = document.querySelector("[data-results]");
  const status = document.querySelector("[data-status]");
  const checkedAt = document.querySelector("[data-checked-at]");
  const queryButton = document.querySelector("[data-query]");

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  }

  function time(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.replace("T", " ").slice(0, 16);
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
      timeZone: "Asia/Shanghai"
    }).format(date);
  }

  function money(price, currency) {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency", currency: currency || "CNY", maximumFractionDigits: 0
    }).format(price);
  }

  function createText(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = value;
    return element;
  }

  function renderLeg(title, leg) {
    const root = document.createElement("section");
    root.className = "flight-leg";
    root.append(createText("div", "leg-title", title));
    root.append(createText("div", "route", `${leg.origin || "—"} → ${leg.destination || "—"}`));
    root.append(createText("div", "leg-time", `${time(leg.departure)} — ${time(leg.arrival)}`));
    root.append(createText("div", "leg-meta", `${leg.carrier} ${leg.flightNumber} · ${leg.durationMinutes ? `${leg.durationMinutes} 分钟` : "时长待确认"}`));
    return root;
  }

  function renderResults(results, fareLabel = "往返单人") {
    resultRoot.replaceChildren();
    if (!results.length) {
      resultRoot.append(createText("p", "empty", "本次实时查询未找到符合当前直飞、人数和时刻条件的可售航班。"));
      return;
    }

    results.forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "result-card";
      const top = document.createElement("div");
      top.className = "result-top";
      top.append(createText("div", "rank", `#${index + 1} · ${fareLabel}`));
      top.append(createText("strong", "price", money(item.price, item.currency)));
      card.append(top);
      const legs = document.createElement("div");
      legs.className = "legs";
      const departure = item.departureDate ? `去程 · ${item.departureDate.slice(5).replace("-", "月")}日` : "去程";
      const returning = item.returnDate ? `返程 · ${item.returnDate.slice(5).replace("-", "月")}日` : "返程";
      legs.append(renderLeg(departure, item.outbound));
      legs.append(renderLeg(returning, item.inbound));
      card.append(legs);
      const details = [];
      if (item.cabin) details.push(item.cabin === "economy" ? "经济舱" : item.cabin);
      if (item.baggage?.checked) details.push(`托运行李：${item.baggage.checked}`);
      if (details.length) card.append(createText("div", "details", details.join("　")));
      resultRoot.append(card);
    });
  }

  function renderOneWayGroup(group) {
    const section = document.createElement("section");
    section.className = "date-group";
    const title = group.direction === "outbound" ? "去程 · 上海浦东 PVG → 曼谷 BKK" : "返程 · 曼谷 BKK → 上海浦东 PVG";
    section.append(createText("h2", "date-heading", `${title} · ${group.date.slice(5).replace("-", "月")}日`));
    if (group.unavailable) {
      section.append(createText("p", "empty", "该日期的数据服务暂时未返回，请稍后重新查询。"));
      return section;
    }
    if (!group.results.length) {
      section.append(createText("p", "empty", "该日期未找到泰国航空直飞可售航班。"));
      return section;
    }
    group.results.forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "result-card one-way";
      const top = document.createElement("div");
      top.className = "result-top";
      top.append(createText("div", "rank", `#${index + 1} · 单程7人总价`));
      top.append(createText("strong", "price", money(item.price, item.currency)));
      card.append(top);
      const leg = renderLeg(group.direction === "outbound" ? "去程" : "返程", item.flight);
      card.append(leg);
      const details = [];
      if (item.cabin === "economy") details.push("经济舱");
      if (item.baggage?.checked) details.push(`托运行李：${item.baggage.checked}`);
      if (details.length) card.append(createText("div", "details", details.join("　")));
      section.append(card);
    });
    return section;
  }

  function renderOneWayGrid(payload) {
    resultRoot.replaceChildren();
    const outbound = document.createElement("section");
    outbound.className = "direction-group";
    outbound.append(createText("h2", "direction-heading", `去程日期 · ${payload.dates.outbound[0].slice(5).replace("-", "月")}日—${payload.dates.outbound.at(-1).slice(5).replace("-", "月")}日`));
    payload.outbound.forEach((group) => outbound.append(renderOneWayGroup(group)));
    const inbound = document.createElement("section");
    inbound.className = "direction-group";
    inbound.append(createText("h2", "direction-heading", `返程日期 · ${payload.dates.inbound[0].slice(5).replace("-", "月")}日—${payload.dates.inbound.at(-1).slice(5).replace("-", "月")}日`));
    payload.inbound.forEach((group) => inbound.append(renderOneWayGroup(group)));
    resultRoot.append(outbound, inbound);
  }

  async function query() {
    if (!config) return;
    queryButton.disabled = true;
    setStatus("正在向航班数据服务查询实时价格…");
    resultRoot.replaceChildren(createText("p", "loading", "查询中，请稍候。"));
    try {
      const response = await fetch(config.endpoint, { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "实时查询暂不可用。");
      if (payload.mode === "one-way-date-grid") renderOneWayGrid(payload);
      else renderResults(payload.results || [], payload.travelers?.label || "往返单人");
      checkedAt.textContent = new Intl.DateTimeFormat("zh-CN", {
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
      }).format(new Date(payload.queriedAt || Date.now()));
      const resultCount = payload.mode === "one-way-date-grid"
        ? [...payload.outbound, ...payload.inbound].reduce((total, group) => total + group.results.length, 0)
        : payload.results?.length || 0;
      const priceLabel = payload.mode === "one-way-date-grid" ? "含税7人单程总价" : payload.travelers ? "含税7人往返总价" : "含税往返总价";
      setStatus(`已查询 ${resultCount} 个符合条件的方案，均已按${priceLabel}从低到高排列。${payload.partial ? " 部分日期暂不可用。" : ""}`);
    } catch (error) {
      resultRoot.replaceChildren(createText("p", "empty", "未展示历史或估算价格；请点击“重新查询”获取本次实时结果。"));
      setStatus(error.message || "实时查询失败，请稍后重试。", true);
    } finally {
      queryButton.disabled = false;
    }
  }

  queryButton.addEventListener("click", query);
  query();
})();
