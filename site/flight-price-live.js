(() => {
  const configs = {
    spring: { name: "春秋航空", endpoint: "/api/flight-prices?airline=spring" },
    thai: { name: "泰国航空", endpoint: "/api/flight-prices?airline=thai" }
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
    root.append(createText("div", "route", title.startsWith("去") ? "PVG → BKK" : "BKK → PVG"));
    root.append(createText("div", "leg-time", `${time(leg.departure)} — ${time(leg.arrival)}`));
    root.append(createText("div", "leg-meta", `${leg.carrier} ${leg.flightNumber} · ${leg.durationMinutes ? `${leg.durationMinutes} 分钟` : "时长待确认"}`));
    return root;
  }

  function renderResults(results) {
    resultRoot.replaceChildren();
    if (!results.length) {
      resultRoot.append(createText("p", "empty", "本次实时查询未找到符合“全程直飞 + 指定航司”的可售航班。"));
      return;
    }

    results.forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "result-card";
      const top = document.createElement("div");
      top.className = "result-top";
      top.append(createText("div", "rank", `#${index + 1} · 往返单人`));
      top.append(createText("strong", "price", money(item.price, item.currency)));
      card.append(top);
      const legs = document.createElement("div");
      legs.className = "legs";
      legs.append(renderLeg("去程 · 2月10日", item.outbound));
      legs.append(renderLeg("返程 · 2月18日", item.inbound));
      card.append(legs);
      const details = [];
      if (item.cabinClass) details.push(item.cabinClass === "economy" ? "经济舱" : item.cabinClass);
      if (item.baggage?.checked) details.push(`托运行李：${item.baggage.checked}`);
      if (details.length) card.append(createText("div", "details", details.join("　")));
      resultRoot.append(card);
    });
  }

  async function query() {
    if (!config) return;
    queryButton.disabled = true;
    setStatus("正在向航班数据服务查询实时价格…");
    resultRoot.replaceChildren(createText("p", "loading", "查询中，请稍候。"));
    try {
      const response = await fetch(config.endpoint, { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "实时查询暂不可用。");
      renderResults(payload.results || []);
      checkedAt.textContent = new Intl.DateTimeFormat("zh-CN", {
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
      }).format(new Date(payload.queriedAt || Date.now()));
      setStatus(`已查询 ${payload.results?.length || 0} 个符合条件的方案，已按含税总价从低到高排列。`);
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
