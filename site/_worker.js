var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/comments.js
async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT id, name, content, created_at FROM comments ORDER BY created_at DESC"
    ).all();
    return Response.json({ success: true, comments: results }, { headers: corsHeaders });
  }
  if (request.method === "POST") {
    try {
      const body = await request.json();
      const name = (body.name || "").trim();
      const content = (body.content || "").trim();
      if (!name || !content) {
        return Response.json(
          { success: false, error: "\u8BF7\u586B\u5199\u59D3\u540D\u548C\u7559\u8A00\u5185\u5BB9" },
          { status: 400, headers: corsHeaders }
        );
      }
      if (name.length > 20) {
        return Response.json(
          { success: false, error: "\u59D3\u540D\u4E0D\u80FD\u8D85\u8FC720\u4E2A\u5B57\u7B26" },
          { status: 400, headers: corsHeaders }
        );
      }
      if (content.length > 500) {
        return Response.json(
          { success: false, error: "\u7559\u8A00\u5185\u5BB9\u4E0D\u80FD\u8D85\u8FC7500\u4E2A\u5B57\u7B26" },
          { status: 400, headers: corsHeaders }
        );
      }
      const { success } = await env.DB.prepare(
        "INSERT INTO comments (name, content, created_at) VALUES (?, ?, datetime('now'))"
      ).bind(name, content).run();
      if (success) {
        return Response.json({ success: true }, { headers: corsHeaders });
      } else {
        return Response.json(
          { success: false, error: "\u63D0\u4EA4\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5" },
          { status: 500, headers: corsHeaders }
        );
      }
    } catch (e) {
      return Response.json(
        { success: false, error: "\u8BF7\u6C42\u683C\u5F0F\u9519\u8BEF" },
        { status: 400, headers: corsHeaders }
      );
    }
  }
  return new Response("Method not allowed", { status: 405 });
}
__name(onRequest, "onRequest");

// api/feedback.js
async function onRequest2(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT * FROM feedback ORDER BY created_at DESC"
    ).all();
    return Response.json({ success: true, feedbacks: results }, { headers: corsHeaders });
  }
  if (request.method === "POST") {
    try {
      const body = await request.json();
      const { family_name, destinations, destination_other, adults, elderly, children, time_pref, accommodation, travel_style, special_needs } = body;
      if (!family_name || !family_name.trim()) {
        return Response.json(
          { success: false, error: "\u8BF7\u586B\u5199\u5BB6\u5EAD\u540D\u79F0" },
          { status: 400, headers: corsHeaders }
        );
      }
      const { success } = await env.DB.prepare(
        `INSERT INTO feedback (family_name, destinations, destination_other, adults, elderly, children, time_pref, accommodation, travel_style, special_needs, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(
        family_name.trim(),
        JSON.stringify(destinations || []),
        (destination_other || "").trim(),
        parseInt(adults) || 0,
        parseInt(elderly) || 0,
        parseInt(children) || 0,
        JSON.stringify(time_pref || []),
        accommodation || "",
        travel_style || "",
        (special_needs || "").trim()
      ).run();
      if (success) {
        return Response.json({ success: true }, { headers: corsHeaders });
      }
      return Response.json(
        { success: false, error: "\u63D0\u4EA4\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5" },
        { status: 500, headers: corsHeaders }
      );
    } catch (e) {
      return Response.json(
        { success: false, error: "\u8BF7\u6C42\u683C\u5F0F\u9519\u8BEF" },
        { status: 400, headers: corsHeaders }
      );
    }
  }
  return new Response("Method not allowed", { status: 405 });
}
__name(onRequest2, "onRequest");

// api/verify-stream
async function onVerifyStream(context) {
  const { request } = context;
  const url = new URL(request.url);
  const streamUrl = url.searchParams.get("url");
  if (!streamUrl) {
    return new Response(JSON.stringify({ ok: false, error: "Missing url parameter" }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const start = Date.now();
    const resp = await fetch(streamUrl, { method: "HEAD", signal: AbortSignal.timeout(8000) });
    const time = Date.now() - start;
    return new Response(JSON.stringify({ ok: resp.ok, status: resp.status, time: time }), {
      headers: { "Content-Type": "application/json", ...cors }
    });
  } catch(e) {
    return new Response(JSON.stringify({ ok: false, status: 0, time: 8000, error: e.message }), {
      headers: { "Content-Type": "application/json", ...cors }
    });
  }
}
__name(onVerifyStream, "onVerifyStream");

// ../.wrangler/tmp/pages-wRSpKC/functionsRoutes-0.9718547786553169.mjs
var routes = [
  {
    routePath: "/api/comments",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/api/feedback",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest2]
  },
  {
    routePath: "/api/verify-stream",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onVerifyStream]
  }
];

// ../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var PASSWORD = "8888";
var TV_HTML = "<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no\">\n<title>\u5168\u7403\u7535\u89c6\u76f4\u64ad \u00b7 IPTV</title>\n<!-- hls.js for HLS playback -->\n<script src=\"https://cdn.jsdelivr.net/npm/hls.js@0.14.17/dist/hls.min.js\"></script>\n<style>\n:root {\n  --bg: #fdf8f0;\n  --card-bg: #fffcf5;\n  --text-primary: #5a3e2b;\n  --text-secondary: #8b7355;\n  --accent: #e8934a;\n  --accent-light: #fef0e0;\n  --border: #e8d5b5;\n  --shadow: rgba(180, 140, 100, 0.12);\n  --dark-bg: #1a202c;\n  --dark-surface: #2d3748;\n}\n* { margin: 0; padding: 0; box-sizing: border-box; }\nbody {\n  font-family: -apple-system, \"PingFang SC\", \"Microsoft YaHei\", sans-serif;\n  background: var(--bg);\n  color: var(--text-primary);\n  line-height: 1.6;\n  min-height: 100vh;\n}\n.container { max-width: 960px; margin: 0 auto; padding: 0 12px; }\n\n/* ===== Hero ===== */\n.hero {\n  background: linear-gradient(135deg, #0f0f23, #1a1a3e 40%, #2d1b69 70%, #6c5ce7);\n  color: #fff;\n  padding: 32px 0 24px;\n  text-align: center;\n  position: relative;\n  overflow: hidden;\n}\n.hero::before {\n  content: '';\n  position: absolute; inset: 0;\n  background: radial-gradient(ellipse at 30% 50%, rgba(108,92,231,0.15) 0%, transparent 60%),\n              radial-gradient(ellipse at 70% 50%, rgba(232,147,74,0.1) 0%, transparent 60%);\n}\n.hero-content { position: relative; z-index: 1; }\n.hero h1 { font-size: clamp(24px, 5vw, 36px); font-weight: 800; letter-spacing: 1px; }\n.hero h1 span { color: var(--accent); }\n.hero p { color: rgba(255,255,255,0.6); font-size: 13px; margin-top: 4px; }\n.hero .sub-badges {\n  display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;\n  margin-top: 12px;\n}\n.hero .sub-badges span {\n  font-size: 11px; padding: 3px 12px;\n  border-radius: 20px;\n  background: rgba(255,255,255,0.1);\n  color: rgba(255,255,255,0.7);\n  border: 1px solid rgba(255,255,255,0.08);\n}\n\n/* ===== Stats Bar ===== */\n.stats-bar {\n  display: flex; justify-content: space-between; align-items: center;\n  padding: 10px 16px; background: var(--card-bg);\n  border-bottom: 1px solid var(--border);\n  font-size: 13px; color: var(--text-secondary); flex-wrap: wrap; gap: 4px;\n}\n.stats-bar strong { color: var(--text-primary); }\n#refreshBtn {\n  background: var(--accent); color: #fff; border: none;\n  padding: 6px 14px; border-radius: 8px; font-size: 12px;\n  cursor: pointer; transition: background 0.2s;\n}\n#refreshBtn:hover { background: #d4783a; }\n#refreshBtn:disabled { opacity: 0.5; cursor: not-allowed; }\n\n/* ===== Filters ===== */\n.filters {\n  display: flex; gap: 8px; padding: 10px 16px;\n  background: var(--card-bg); border-bottom: 1px solid var(--border);\n  flex-wrap: wrap; position: sticky; top: 0; z-index: 10;\n}\n.filters select, .filters input {\n  padding: 9px 12px; border: 2px solid var(--border);\n  border-radius: 10px; background: var(--card-bg);\n  font-size: 13px; color: var(--text-primary);\n  outline: none; transition: border-color 0.2s;\n  -webkit-appearance: none; appearance: none;\n}\n.filters select {\n  background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238b7355' stroke-width='2' fill='none'/%3E%3C/svg%3E\");\n  background-repeat: no-repeat; background-position: right 10px center;\n  padding-right: 32px;\n}\n.filters select:focus, .filters input:focus { border-color: var(--accent); }\n.filters .filter-country { flex: 2; min-width: 130px; }\n.filters .filter-category { flex: 1; min-width: 110px; }\n.filters .filter-search {\n  flex: 3; min-width: 180px;\n  padding-left: 36px;\n  background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238b7355' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='M21 21l-4.35-4.35'/%3E%3C/svg%3E\");\n  background-repeat: no-repeat; background-position: 10px center;\n}\n\n/* ===== Country Quick Picks ===== */\n.quick-picks {\n  display: flex; gap: 6px; padding: 8px 16px;\n  overflow-x: auto; -webkit-overflow-scrolling: touch;\n  background: var(--card-bg); border-bottom: 1px solid var(--border);\n  scrollbar-width: none;\n}\n.quick-picks::-webkit-scrollbar { display: none; }\n.quick-pick {\n  flex-shrink: 0; padding: 5px 14px; border-radius: 20px;\n  border: 2px solid var(--border); background: var(--card-bg);\n  font-size: 13px; cursor: pointer; transition: all 0.2s;\n  color: var(--text-secondary); white-space: nowrap;\n  display: flex; align-items: center; gap: 4px;\n}\n.quick-pick:hover { border-color: var(--accent); color: var(--text-primary); }\n.quick-pick.active {\n  background: var(--accent); border-color: var(--accent);\n  color: #fff; font-weight: 600;\n}\n\n/* ===== Loading ===== */\n.loading {\n  text-align: center; padding: 80px 20px;\n  color: var(--text-secondary);\n}\n.spinner {\n  width: 40px; height: 40px; margin: 0 auto 16px;\n  border: 4px solid var(--border); border-top-color: var(--accent);\n  border-radius: 50%; animation: spin 0.8s linear infinite;\n}\n@keyframes spin { to { transform: rotate(360deg); } }\n.loading-progress {\n  font-size: 13px; color: var(--text-secondary); margin-top: 8px;\n}\n.loading-bar {\n  width: 240px; height: 4px; margin: 12px auto;\n  background: var(--border); border-radius: 4px; overflow: hidden;\n}\n.loading-bar-fill {\n  height: 100%; width: 0%; background: var(--accent);\n  border-radius: 4px; transition: width 0.3s;\n}\n\n/* ===== Channels ===== */\n.channel-grid {\n  display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));\n  gap: 10px; padding: 12px; padding-bottom: 120px;\n}\n.channel-card {\n  background: var(--card-bg); border: 2px solid var(--border);\n  border-radius: 14px; padding: 14px 10px;\n  cursor: pointer; transition: all 0.2s;\n  display: flex; flex-direction: column; align-items: center;\n  position: relative;\n}\n.channel-card:hover {\n  border-color: var(--accent); box-shadow: 0 4px 16px var(--shadow);\n  transform: translateY(-2px);\n}\n.channel-card:active { transform: scale(0.97); }\n.channel-card .logo-wrap {\n  width: 56px; height: 56px; border-radius: 10px;\n  background: #f5f5f5; display: flex; align-items: center;\n  justify-content: center; margin-bottom: 8px; overflow: hidden;\n  border: 1px solid #eee;\n}\n.channel-card .logo-wrap img {\n  width: 100%; height: 100%; object-fit: contain;\n}\n.channel-card .logo-wrap .logo-fallback {\n  font-size: 24px; color: var(--text-secondary);\n}\n.channel-card .name {\n  font-weight: 700; font-size: 13px; text-align: center;\n  margin-bottom: 2px; line-height: 1.3; display: -webkit-box;\n  -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;\n}\n.channel-card .country-tag {\n  font-size: 11px; color: var(--text-secondary);\n  margin-bottom: 4px;\n}\n.channel-card .badges {\n  display: flex; gap: 3px; flex-wrap: wrap; justify-content: center;\n}\n.channel-card .badge {\n  font-size: 10px; padding: 2px 8px; border-radius: 10px;\n  background: var(--accent-light); color: var(--accent);\n  font-weight: 600; line-height: 1.4;\n}\n.channel-card .hd-badge {\n  background: #e8faf4; color: #047857;\n}\n.channel-card .play-hint {\n  position: absolute; inset: 0;\n  display: flex; align-items: center; justify-content: center;\n  background: rgba(0,0,0,0.5); border-radius: 12px;\n  opacity: 0; transition: opacity 0.2s; color: #fff;\n  font-size: 13px; font-weight: 600; gap: 6px;\n}\n.channel-card:hover .play-hint { opacity: 1; }\n.channel-card .no-stream {\n  opacity: 0.5; cursor: default;\n}\n\n/* ===== Empty state ===== */\n.empty-state {\n  text-align: center; padding: 60px 20px; color: var(--text-secondary);\n  grid-column: 1 / -1;\n}\n.empty-state .big-icon { font-size: 48px; margin-bottom: 12px; }\n.empty-state p { font-size: 14px; }\n\n/* ===== Player Panel (fixed bottom) ===== */\n.player-panel {\n  position: fixed; bottom: 0; left: 0; right: 0;\n  z-index: 1000; transition: transform 0.35s cubic-bezier(0.4,0,0.2,1);\n  box-shadow: 0 -4px 24px rgba(0,0,0,0.25);\n}\n.player-panel.hidden { transform: translateY(100%); }\n.player-header {\n  display: flex; align-items: center;\n  padding: 8px 14px; background: var(--dark-bg); color: #fff;\n  gap: 10px;\n}\n.player-header .ch-logo {\n  width: 32px; height: 32px; border-radius: 6px;\n  background: #444; object-fit: contain; flex-shrink: 0;\n}\n.player-header .ch-info { flex: 1; min-width: 0; }\n.player-header .ch-name { font-size: 14px; font-weight: 600; }\n.player-header .ch-meta { font-size: 11px; color: #a0aec0; }\n.player-header .player-status {\n  font-size: 11px; color: #68d391; white-space: nowrap;\n  display: flex; align-items: center; gap: 4px;\n}\n.player-header .player-status.error { color: #fc8181; }\n.player-header .player-status.buffering { color: var(--accent); }\n.player-header .player-actions {\n  display: flex; gap: 6px; align-items: center;\n}\n.player-header .player-actions button {\n  background: rgba(255,255,255,0.1); border: none; color: #fff;\n  width: 34px; height: 34px; border-radius: 8px; cursor: pointer;\n  font-size: 16px; transition: background 0.2s;\n  display: flex; align-items: center; justify-content: center;\n}\n.player-header .player-actions button:hover { background: rgba(255,255,255,0.2); }\n.player-header .player-actions .ext-link {\n  font-size: 12px; width: auto; padding: 0 10px; text-decoration: none;\n}\n#video-wrapper {\n  width: 100%; background: #000;\n  max-height: 45vh; position: relative;\n}\n#video-wrapper video {\n  width: 100%; max-height: 45vh; display: block;\n  background: #000;\n}\n.player-drag-handle {\n  display: none; width: 100%; padding: 6px 0;\n  text-align: center; cursor: grab;\n}\n.player-drag-handle::after {\n  content: ''; display: inline-block;\n  width: 36px; height: 4px; background: rgba(255,255,255,0.3);\n  border-radius: 4px;\n}\n\n/* ===== \u56fd\u5bb6\u56fd\u65d7 emoji helper ===== */\n.flag { font-size: 1.1em; }\n\n/* ===== Health Badge ===== */\n.channel-card .health-dot {\n  position: absolute; top: 6px; right: 6px;\n  width: 10px; height: 10px; border-radius: 50%;\n  border: 2px solid var(--card-bg); z-index: 1;\n}\n.health-dot.verified { background: #48bb78; }\n.health-dot.dead { background: #fc8181; }\n.health-dot.unknown { background: #cbd5e0; }\n.channel-card:not(.no-stream) .health-dot.verified { box-shadow: 0 0 4px rgba(72,187,120,0.6); }\n\n/* ===== Verify Bar ===== */\n.verify-bar {\n  display: none; padding: 6px 16px;\n  background: #f0fff4; border-bottom: 1px solid #c6f6d5;\n  font-size: 12px; color: #276749; align-items: center; gap: 8px;\n}\n.verify-bar.show { display: flex; }\n.verify-bar .vb-fill-wrap {\n  flex: 1; height: 6px; background: #c6f6d5; border-radius: 4px; overflow: hidden; max-width: 300px;\n}\n.verify-bar .vb-fill {\n  height: 100%; width: 0%; background: #48bb78; border-radius: 4px; transition: width 0.3s;\n}\n.verify-bar .vb-status { white-space: nowrap; font-weight: 600; }\n.verify-bar .vb-close {\n  background: none; border: none; cursor: pointer; font-size: 14px;\n  color: #276749; padding: 2px 6px; border-radius: 4px; margin-left: auto;\n}\n.verify-bar .vb-close:hover { background: #c6f6d5; }\n\n#verifyBtn {\n  background: #48bb78; color: #fff; border: none;\n  padding: 6px 14px; border-radius: 8px; font-size: 12px;\n  cursor: pointer; transition: background 0.2s; white-space: nowrap;\n}\n#verifyBtn:hover { background: #38a169; }\n#verifyBtn:disabled { opacity: 0.5; cursor: not-allowed; }\n#verifyBtn.verifying { animation: pulse 1.5s ease-in-out infinite; }\n@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }\n\n/* ===== Verify filter checkbox ===== */\n.verify-filter {\n  display: flex; align-items: center; gap: 4px;\n  font-size: 12px; color: var(--text-secondary); cursor: pointer;\n  white-space: nowrap; user-select: none;\n}\n.verify-filter input { accent-color: var(--accent); cursor: pointer; }\n\n/* ===== Toast ===== */\n.toast {\n  position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);\n  background: var(--dark-bg); color: #fff;\n  padding: 10px 20px; border-radius: 10px; font-size: 13px;\n  z-index: 2000; opacity: 0; transition: opacity 0.3s;\n  pointer-events: none; white-space: nowrap;\n}\n.toast.show { opacity: 1; }\n\n/* ===== Responsive ===== */\n@media (max-width: 600px) {\n  .channel-grid {\n    grid-template-columns: repeat(3, 1fr);\n    gap: 6px; padding: 8px; padding-bottom: 100px;\n  }\n  .channel-card { padding: 10px 6px; border-radius: 12px; }\n  .channel-card .logo-wrap { width: 44px; height: 44px; }\n  .channel-card .name { font-size: 11px; }\n  .channel-card .badge { font-size: 9px; padding: 1px 6px; }\n  .channel-card .country-tag { font-size: 10px; }\n  .filters { padding: 8px 10px; gap: 6px; }\n  .filters select, .filters input { font-size: 12px; padding: 7px 10px; }\n  .filters .filter-search { min-width: 140px; }\n  .stats-bar { font-size: 11px; padding: 8px 12px; }\n  .player-header { padding: 6px 10px; }\n  .player-header .ch-name { font-size: 13px; }\n  #video-wrapper { max-height: 35vh; }\n  #video-wrapper video { max-height: 35vh; }\n}\n@media (max-width: 400px) {\n  .channel-grid { grid-template-columns: repeat(2, 1fr); }\n  .filters .filter-search { min-width: 100%; }\n}\n@media (hover: none) and (pointer: coarse) {\n  .channel-card .play-hint { display: none; }\n  .channel-card:active { transform: scale(0.97); }\n}\n</style>\n</head>\n<body>\n\n<!-- ===== Hero ===== -->\n<div class=\"hero\">\n  <div class=\"hero-content\">\n    <h1>\ud83d\udcfa \u5168\u7403 <span>\u7535\u89c6</span>\u76f4\u64ad</h1>\n    <p>30,000+ \u9891\u9053 \u00b7 190+ \u56fd\u5bb6/\u5730\u533a \u00b7 \u514d\u8d39\u516c\u5f00 IPTV</p>\n    <div class=\"sub-badges\">\n      <span>\ud83d\udd0d \u6d4f\u89c8\u9891\u9053</span>\n      <span>\u25b6\ufe0f \u5728\u7ebf\u64ad\u653e</span>\n      <span>\ud83d\udccb \u590d\u5236\u94fe\u63a5</span>\n    </div>\n  </div>\n</div>\n\n<!-- ===== Stats ===== -->\n<div class=\"stats-bar\">\n  <span id=\"statsText\">\ud83d\udce1 \u52a0\u8f7d\u6570\u636e\u4e2d...</span>\n  <div style=\"display:flex;gap:6px;align-items:center;flex-wrap:wrap;\">\n    <button id=\"verifyBtn\" onclick=\"verifyAllStreams()\" title=\"\u6d4b\u8bd5\u6240\u6709\u76f4\u64ad\u94fe\u63a5\u7684\u53ef\u7528\u6027\">\ud83d\udd0d \u6d4b\u8bd5\u94fe\u63a5</button>\n    <button id=\"refreshBtn\" onclick=\"loadAllData()\">\ud83d\udd04 \u5237\u65b0</button>\n  </div>\n</div>\n\n<!-- ===== Filters ===== -->\n<div class=\"filters\" id=\"filters\">\n  <select class=\"filter-country\" id=\"countryFilter\" onchange=\"applyFilters()\">\n    <option value=\"\">\ud83c\udf0d \u6240\u6709\u56fd\u5bb6</option>\n  </select>\n  <select class=\"filter-category\" id=\"categoryFilter\" onchange=\"applyFilters()\">\n    <option value=\"\">\ud83c\udff7\ufe0f \u5168\u90e8\u5206\u7c7b</option>\n  </select>\n  <input class=\"filter-search\" id=\"searchFilter\" type=\"search\"\n         placeholder=\"\ud83d\udd0d \u641c\u7d22\u9891\u9053\u540d\u79f0...\" oninput=\"applyFilters()\">\n  <label class=\"verify-filter\" id=\"hideDeadLabel\" style=\"display:none;\">\n    <input type=\"checkbox\" id=\"hideDeadFilter\" onchange=\"applyFilters()\" checked>\n    \u9690\u85cf\u5931\u6548\n  </label>\n</div>\n\n<!-- ===== Quick Country Picks ===== -->\n<div class=\"quick-picks\" id=\"quickPicks\"></div>\n\n<!-- ===== Verify Progress ===== -->\n<div class=\"verify-bar\" id=\"verifyBar\">\n  <span>\ud83e\uddea \u6d4b\u8bd5\u94fe\u63a5\u4e2d...</span>\n  <div class=\"vb-fill-wrap\"><div class=\"vb-fill\" id=\"verifyFill\"></div></div>\n  <span class=\"vb-status\" id=\"verifyStatus\">0 / 0</span>\n  <button class=\"vb-close\" onclick=\"closeVerifyBar()\">\u2715</button>\n</div>\n\n<!-- ===== Loading ===== -->\n<div class=\"loading\" id=\"loadingState\">\n  <div class=\"spinner\"></div>\n  <div>\u6b63\u5728\u52a0\u8f7d\u9891\u9053\u6570\u636e...</div>\n  <div class=\"loading-bar\"><div class=\"loading-bar-fill\" id=\"loadingBarFill\"></div></div>\n  <div class=\"loading-progress\" id=\"loadingProgress\">\u51c6\u5907\u4e2d...</div>\n</div>\n\n<!-- ===== Channel Grid ===== -->\n<div class=\"container\">\n  <div class=\"channel-grid\" id=\"channelGrid\"></div>\n</div>\n\n<!-- ===== Player Panel ===== -->\n<div class=\"player-panel hidden\" id=\"playerPanel\">\n  <div class=\"player-header\">\n    <img class=\"ch-logo\" id=\"playerLogo\" src=\"\" alt=\"\" onerror=\"this.style.display='none'\">\n    <div class=\"ch-info\">\n      <div class=\"ch-name\" id=\"playerName\">\u9009\u62e9\u9891\u9053</div>\n      <div class=\"ch-meta\" id=\"playerMeta\"></div>\n    </div>\n    <div class=\"player-status\" id=\"playerStatus\">\u23f8\ufe0f \u5df2\u6682\u505c</div>\n    <div class=\"player-actions\">\n      <button onclick=\"togglePlayerMute()\" id=\"muteBtn\" title=\"\u9759\u97f3\">\ud83d\udd0a</button>\n      <a id=\"vlcLink\" href=\"#\" target=\"_blank\" rel=\"noopener\"\n         class=\"ext-link\" style=\"background:rgba(255,255,255,0.1);border:none;color:#fff;\n         border-radius:8px;cursor:pointer;font-size:12px;padding:0 10px;text-decoration:none;\n         display:flex;align-items:center;gap:4px;height:34px;\"\n         title=\"\u5728 VLC \u4e2d\u6253\u5f00\">\ud83c\udfac VLC</a>\n      <button onclick=\"closePlayer()\" title=\"\u5173\u95ed\">\u2715</button>\n    </div>\n  </div>\n  <div id=\"video-wrapper\">\n    <video id=\"playerVideo\" controls autoplay playsinline></video>\n  </div>\n</div>\n\n<!-- ===== Toast ===== -->\n<div class=\"toast\" id=\"toast\"></div>\n\n<script>\n// ============================================================\n//  STATE\n// ============================================================\nconst STATE = {\n  channels: [],\n  streams: [],\n  countries: [],\n  categories: [],\n  filtered: [],\n  loading: false,\n  currentChannel: null,    // { channel, stream }\n  hls: null,\n};\n\n// Country flag emoji map (common ones)\nconst FLAG_MAP = {\n  CN:'\ud83c\udde8\ud83c\uddf3',US:'\ud83c\uddfa\ud83c\uddf8',GB:'\ud83c\uddec\ud83c\udde7',JP:'\ud83c\uddef\ud83c\uddf5',KR:'\ud83c\uddf0\ud83c\uddf7',FR:'\ud83c\uddeb\ud83c\uddf7',DE:'\ud83c\udde9\ud83c\uddea',IT:'\ud83c\uddee\ud83c\uddf9',\n  ES:'\ud83c\uddea\ud83c\uddf8',PT:'\ud83c\uddf5\ud83c\uddf9',RU:'\ud83c\uddf7\ud83c\uddfa',IN:'\ud83c\uddee\ud83c\uddf3',BR:'\ud83c\udde7\ud83c\uddf7',CA:'\ud83c\udde8\ud83c\udde6',AU:'\ud83c\udde6\ud83c\uddfa',MY:'\ud83c\uddf2\ud83c\uddfe',\n  SG:'\ud83c\uddf8\ud83c\uddec',TH:'\ud83c\uddf9\ud83c\udded',VN:'\ud83c\uddfb\ud83c\uddf3',PH:'\ud83c\uddf5\ud83c\udded',ID:'\ud83c\uddee\ud83c\udde9',HK:'\ud83c\udded\ud83c\uddf0',TW:'\ud83c\uddf9\ud83c\uddfc',NL:'\ud83c\uddf3\ud83c\uddf1',\n  SE:'\ud83c\uddf8\ud83c\uddea',NO:'\ud83c\uddf3\ud83c\uddf4',DK:'\ud83c\udde9\ud83c\uddf0',FI:'\ud83c\uddeb\ud83c\uddee',CH:'\ud83c\udde8\ud83c\udded',AT:'\ud83c\udde6\ud83c\uddf9',BE:'\ud83c\udde7\ud83c\uddea',IE:'\ud83c\uddee\ud83c\uddea',\n  PL:'\ud83c\uddf5\ud83c\uddf1',CZ:'\ud83c\udde8\ud83c\uddff',SK:'\ud83c\uddf8\ud83c\uddf0',HU:'\ud83c\udded\ud83c\uddfa',RO:'\ud83c\uddf7\ud83c\uddf4',GR:'\ud83c\uddec\ud83c\uddf7',TR:'\ud83c\uddf9\ud83c\uddf7',IL:'\ud83c\uddee\ud83c\uddf1',\n  SA:'\ud83c\uddf8\ud83c\udde6',AE:'\ud83c\udde6\ud83c\uddea',EG:'\ud83c\uddea\ud83c\uddec',ZA:'\ud83c\uddff\ud83c\udde6',AR:'\ud83c\udde6\ud83c\uddf7',MX:'\ud83c\uddf2\ud83c\uddfd',CO:'\ud83c\udde8\ud83c\uddf4',CL:'\ud83c\udde8\ud83c\uddf1',\n  NZ:'\ud83c\uddf3\ud83c\uddff',PK:'\ud83c\uddf5\ud83c\uddf0',BD:'\ud83c\udde7\ud83c\udde9',UA:'\ud83c\uddfa\ud83c\udde6',KE:'\ud83c\uddf0\ud83c\uddea',NG:'\ud83c\uddf3\ud83c\uddec',\n};\n\n// \"Popular\" countries shown as quick picks\nconst QUICK_COUNTRIES = [\n  { code: 'CN', name: '\u4e2d\u56fd' },\n  { code: 'US', name: '\u7f8e\u56fd' },\n  { code: 'GB', name: '\u82f1\u56fd' },\n  { code: 'JP', name: '\u65e5\u672c' },\n  { code: 'KR', name: '\u97e9\u56fd' },\n  { code: 'FR', name: '\u6cd5\u56fd' },\n  { code: 'DE', name: '\u5fb7\u56fd' },\n  { code: 'MY', name: '\u9a6c\u6765\u897f\u4e9a' },\n  { code: 'SG', name: '\u65b0\u52a0\u5761' },\n  { code: 'TH', name: '\u6cf0\u56fd' },\n  { code: 'TW', name: '\u53f0\u6e7e' },\n  { code: 'HK', name: '\u9999\u6e2f' },\n  { code: 'RU', name: '\u4fc4\u7f57\u65af' },\n  { code: 'IN', name: '\u5370\u5ea6' },\n  { code: 'BR', name: '\u5df4\u897f' },\n];\n\n// ============================================================\n//  STREAM VERIFICATION\n// ============================================================\nconst VERIFY = {\n  queue: [],          // [{chId, url}]\n  inProgress: false,\n  concurrency: 12,\n  tested: 0,\n  dead: 0,\n  total: 0,\n  cache: {},          // url -> {ok, time, testedAt}\n  cacheKey: 'tv_stream_status_v2',\n  cacheTTL: 6 * 3600 * 1000, // 6 hours\n};\n\nfunction loadVerifyCache() {\n  try {\n    const raw = localStorage.getItem(VERIFY.cacheKey);\n    if (!raw) return;\n    const data = JSON.parse(raw);\n    if (data.version !== 2) return;\n    const age = Date.now() - data.updatedAt;\n    if (age > VERIFY.cacheTTL) { localStorage.removeItem(VERIFY.cacheKey); return; }\n    VERIFY.cache = data.results || {};\n  } catch(e) { /* ignore corrupt cache */ }\n}\n\nfunction saveVerifyCache() {\n  try {\n    const data = {\n      version: 2,\n      updatedAt: Date.now(),\n      results: VERIFY.cache,\n    };\n    localStorage.setItem(VERIFY.cacheKey, JSON.stringify(data));\n  } catch(e) {\n    // localStorage full \u2014 clear oldest entries\n    if (e.name === 'QuotaExceededError') {\n      const entries = Object.entries(VERIFY.cache);\n      if (entries.length > 100) {\n        entries.sort((a, b) => (a[1].testedAt || 0) - (b[1].testedAt || 0));\n        const drop = Math.floor(entries.length * 0.3);\n        entries.slice(0, drop).forEach(([k]) => delete VERIFY.cache[k]);\n        try { localStorage.setItem(VERIFY.cacheKey, JSON.stringify({ version: 2, updatedAt: Date.now(), results: VERIFY.cache })); } catch(e2) { /* give up */ }\n      }\n    }\n  }\n}\n\nfunction applyCachedStatusToChannels() {\n  const cache = VERIFY.cache;\n  for (const ch of STATE.channels) {\n    const stream = ch._primaryStream;\n    if (!stream) continue;\n    const result = cache[stream.url];\n    if (result) {\n      ch._verified = result.ok ? 'verified' : 'dead';\n      ch._verifyTime = result.testedAt;\n    } else {\n      ch._verified = 'unknown';\n    }\n  }\n}\n\nfunction getChannelDeadCount() {\n  return STATE.channels.filter(c => c._verified === 'dead').length;\n}\nfunction getChannelOkCount() {\n  return STATE.channels.filter(c => c._verified === 'verified').length;\n}\nfunction getChannelUnknownCount() {\n  return STATE.channels.filter(c => !c._verified || c._verified === 'unknown').length;\n}\n\nfunction showHideDeadFilter() {\n  const label = document.getElementById('hideDeadLabel');\n  if (!label) return;\n  const hasDead = getChannelDeadCount() > 0;\n  label.style.display = hasDead ? 'inline-flex' : 'none';\n}\n\nasync function testSingleStream(url) {\n  const start = performance.now();\n  try {\n    const resp = await fetch(url, {\n      method: 'HEAD',\n      mode: 'no-cors',\n      signal: AbortSignal.timeout(6000),\n    });\n    const elapsed = Math.round(performance.now() - start);\n    // no-cors opaque response: resp.ok is false but resp.type is 'opaque'\n    // If fetch resolves at all, server is reachable\n    return { ok: true, time: elapsed, status: 0 };\n  } catch (e) {\n    const elapsed = Math.round(performance.now() - start);\n    return { ok: false, time: elapsed, status: 0 };\n  }\n}\n\nasync function processVerifyBatch() {\n  if (!VERIFY.queue.length || !VERIFY.inProgress) return;\n\n  const batch = VERIFY.queue.splice(0, VERIFY.concurrency);\n  const promises = batch.map(async (item) => {\n    // Check if already cached recently\n    const cached = VERIFY.cache[item.url];\n    if (cached && (Date.now() - cached.testedAt) < VERIFY.cacheTTL) {\n      VERIFY.tested++;\n      return;\n    }\n    const result = await testSingleStream(item.url);\n    VERIFY.cache[item.url] = { ok: result.ok, time: result.time, testedAt: Date.now() };\n    VERIFY.tested++;\n    if (!result.ok) VERIFY.dead++;\n    // Update channel status\n    const ch = STATE.channels.find(c => c.id === item.chId);\n    if (ch) {\n      ch._verified = result.ok ? 'verified' : 'dead';\n      ch._verifyTime = Date.now();\n    }\n    // Throttled cache save\n    if (VERIFY.tested % 30 === 0) saveVerifyCache();\n  });\n\n  await Promise.allSettled(promises);\n  updateVerifyUI();\n  applyFilters();\n  showHideDeadFilter();\n\n  if (VERIFY.queue.length > 0) {\n    // Schedule next batch asynchronously\n    setTimeout(() => processVerifyBatch(), 50);\n  } else {\n    // Done\n    VERIFY.inProgress = false;\n    saveVerifyCache();\n    // Re-sync ALL channels from cache so shared URLs get marked\n    applyCachedStatusToChannels();\n    document.getElementById('verifyBtn').disabled = false;\n    document.getElementById('verifyBtn').classList.remove('verifying');\n    document.getElementById('verifyBtn').textContent = '\ud83d\udd0d \u91cd\u65b0\u6d4b\u8bd5';\n    document.getElementById('verifyBar').classList.remove('show');\n    showToast('\u2705 \u94fe\u63a5\u6d4b\u8bd5\u5b8c\u6210\uff01\u5df2\u6d4b\u8bd5 ' + VERIFY.tested + ' \u4e2a\u94fe\u63a5\uff0c' +\n      (VERIFY.dead > 0 ? VERIFY.dead + ' \u4e2a\u5931\u6548\u5df2\u9690\u85cf' : '\u5168\u90e8\u53ef\u7528'), 3000);\n    applyFilters();\n    updateStats();\n    showHideDeadFilter();\n  }\n}\n\nfunction updateVerifyUI() {\n  const fill = document.getElementById('verifyFill');\n  const status = document.getElementById('verifyStatus');\n  const pct = VERIFY.total > 0 ? Math.round((VERIFY.tested / VERIFY.total) * 100) : 0;\n  if (fill) fill.style.width = pct + '%';\n  if (status) status.textContent = `${VERIFY.tested} / ${VERIFY.total} (${pct}%)`;\n}\n\nfunction verifyAllStreams() {\n  if (VERIFY.inProgress) return;\n  if (VERIFY.queue.length > 0 && VERIFY.inProgress) return;\n\n  // Collect all unique stream URLs\n  const seen = new Set();\n  VERIFY.queue = [];\n  for (const ch of STATE.channels) {\n    const stream = ch._primaryStream;\n    if (!stream || !stream.url) continue;\n    const key = stream.url;\n    if (seen.has(key)) continue;\n    seen.add(key);\n    VERIFY.queue.push({ chId: ch.id, url: stream.url });\n  }\n\n  VERIFY.total = VERIFY.queue.length;\n  VERIFY.tested = 0;\n  VERIFY.dead = 0;\n  VERIFY.inProgress = true;\n\n  // UI\n  const btn = document.getElementById('verifyBtn');\n  btn.disabled = true;\n  btn.classList.add('verifying');\n  btn.textContent = '\u23f3 \u6d4b\u8bd5\u4e2d...';\n  document.getElementById('verifyBar').classList.add('show');\n  updateVerifyUI();\n\n  // Start processing\n  processVerifyBatch();\n}\n\nfunction closeVerifyBar() {\n  document.getElementById('verifyBar').classList.remove('show');\n}\n\nfunction startBackgroundVerify() {\n  // Only verify channels that have no cached status\n  const toVerify = STATE.channels.filter(ch => {\n    const stream = ch._primaryStream;\n    if (!stream || !stream.url) return false;\n    return !VERIFY.cache[stream.url];\n  });\n  if (toVerify.length === 0) {\n    showHideDeadFilter();\n    return;\n  }\n\n  // Queue only unknown streams\n  const seen = new Set();\n  VERIFY.queue = [];\n  for (const ch of toVerify) {\n    if (!ch._primaryStream?.url || seen.has(ch._primaryStream.url)) continue;\n    seen.add(ch._primaryStream.url);\n    VERIFY.queue.push({ chId: ch.id, url: ch._primaryStream.url });\n  }\n\n  if (VERIFY.queue.length === 0) return;\n\n  VERIFY.total = VERIFY.queue.length;\n  VERIFY.tested = 0;\n  VERIFY.dead = 0;\n  VERIFY.inProgress = true;\n\n  const btn = document.getElementById('verifyBtn');\n  btn.disabled = true;\n  btn.classList.add('verifying');\n  btn.textContent = '\u23f3 \u6d4b\u8bd5\u4e2d...';\n  document.getElementById('verifyBar').classList.add('show');\n  updateVerifyUI();\n\n  processVerifyBatch();\n}\n\n// ============================================================\n//  DATA LOADING\n// ============================================================\nasync function loadAllData() {\n  if (STATE.loading) return;\n  STATE.loading = true;\n  document.getElementById('refreshBtn').disabled = true;\n  showLoading(true);\n\n  try {\n    // Load all data in parallel\n    const [countries, categories, channels, streams] = await Promise.all([\n      fetchJSON('https://iptv-org.github.io/api/countries.json'),\n      fetchJSON('https://iptv-org.github.io/api/categories.json'),\n      fetchWithProgress('https://iptv-org.github.io/api/channels.json', '\u9891\u9053\u5143\u6570\u636e'),\n      fetchWithProgress('https://iptv-org.github.io/api/streams.json', '\u76f4\u64ad\u6d41\u5730\u5740'),\n    ]);\n\n    STATE.countries = (countries || []).sort((a, b) => a.name.localeCompare(b.name));\n    STATE.categories = (categories || []).sort((a, b) => a.name.localeCompare(b.name));\n    STATE.channels = channels || [];\n    STATE.streams = streams || [];\n\n    // Build lookup: channelId -> streams[]\n    const streamMap = {};\n    for (const s of STATE.streams) {\n      if (!streamMap[s.channel]) streamMap[s.channel] = [];\n      streamMap[s.channel].push(s);\n    }\n\n    // Attach streams to channels (just first working one for simplicity)\n    for (const ch of STATE.channels) {\n      ch._streams = streamMap[ch.id] || [];\n      ch._primaryStream = ch._streams.find(s => s.status === 'online' && s.url) || ch._streams[0];\n    }\n\n    // Load verification cache and apply to channels\n    loadVerifyCache();\n    applyCachedStatusToChannels();\n\n    // Populate UI\n    populateFilters();\n    populateQuickPicks();\n    applyFilters();\n    updateStats();\n\n    // Start background verification for untested streams\n    setTimeout(startBackgroundVerify, 2000);\n\n  } catch (err) {\n    console.error('\u52a0\u8f7d\u5931\u8d25:', err);\n    showToast('\u26a0\ufe0f \u6570\u636e\u52a0\u8f7d\u5931\u8d25: ' + err.message, 4000);\n    document.getElementById('channelGrid').innerHTML = `\n      <div class=\"empty-state\">\n        <div class=\"big-icon\">\ud83d\ude35</div>\n        <p>\u6570\u636e\u52a0\u8f7d\u5931\u8d25</p>\n        <p style=\"font-size:12px;color:#999;margin-top:8px;\">${err.message}</p>\n        <button onclick=\"loadAllData()\" style=\"margin-top:16px;padding:10px 24px;\n          background:var(--accent);color:#fff;border:none;border-radius:10px;\n          font-size:14px;cursor:pointer;\">\ud83d\udd04 \u91cd\u8bd5</button>\n      </div>`;\n  }\n\n  STATE.loading = false;\n  document.getElementById('refreshBtn').disabled = false;\n  showLoading(false);\n}\n\nasync function fetchJSON(url) {\n  const res = await fetch(url);\n  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);\n  return res.json();\n}\n\n// Fetch with progress simulation\nasync function fetchWithProgress(url, label) {\n  // We can't measure real progress with fetch, so simulate it\n  updateProgress(label, 10);\n  const res = await fetch(url);\n  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);\n\n  updateProgress(label, 40);\n\n  // Read the body\n  const reader = res.body.getReader();\n  const chunks = [];\n  let received = 0;\n\n  while (true) {\n    const { done, value } = await reader.read();\n    if (done) break;\n    chunks.push(value);\n    received += value.length;\n    // Simulate progress between 40-90%\n    const pct = Math.min(40 + (received / 5000000) * 50, 90);\n    updateProgress(label, Math.round(pct));\n  }\n\n  updateProgress(label, 100);\n  const allBytes = new Uint8Array(received);\n  let pos = 0;\n  for (const chunk of chunks) {\n    allBytes.set(chunk, pos);\n    pos += chunk.length;\n  }\n\n  const text = new TextDecoder('utf-8').decode(allBytes);\n  return JSON.parse(text);\n}\n\nfunction updateProgress(label, pct) {\n  document.getElementById('loadingBarFill').style.width = pct + '%';\n  document.getElementById('loadingProgress').textContent = `${label}: ${pct}%`;\n}\n\nfunction showLoading(show) {\n  document.getElementById('loadingState').style.display = show ? 'block' : 'none';\n}\n\nfunction updateStats() {\n  const total = STATE.channels.length;\n  const withStreams = STATE.channels.filter(c => c._primaryStream).length;\n  const countries = STATE.countries.length;\n  const okCount = getChannelOkCount();\n  const deadCount = getChannelDeadCount();\n  let extra = '';\n  if (okCount > 0 || deadCount > 0) {\n    extra = ` \u00b7 <span style=\"color:#48bb78;\">\u2705${okCount}</span>` +\n      (deadCount > 0 ? `<span style=\"color:#fc8181;\"> \u274c${deadCount}</span>` : '');\n  }\n  document.getElementById('statsText').innerHTML =\n    `\ud83d\udce1 <strong>${total.toLocaleString()}</strong> \u9891\u9053 \u00b7 ` +\n    `<strong>${withStreams.toLocaleString()}</strong> \u53ef\u64ad\u653e \u00b7 ` +\n    `<strong>${countries}</strong> \u4e2a\u56fd\u5bb6/\u5730\u533a${extra}`;\n}\n\n// ============================================================\n//  FILTERS\n// ============================================================\nfunction populateFilters() {\n  const countrySel = document.getElementById('countryFilter');\n  const catSel = document.getElementById('categoryFilter');\n\n  // Countries\n  for (const c of STATE.countries) {\n    const opt = document.createElement('option');\n    opt.value = c.code;\n    const flag = FLAG_MAP[c.code] || '';\n    opt.textContent = `${flag} ${c.name}`;\n    countrySel.appendChild(opt);\n  }\n\n  // Categories (Chinese-friendly names)\n  const CAT_NAMES = {\n    'news': '\ud83d\udcf0 \u65b0\u95fb', 'sports': '\u26bd \u4f53\u80b2', 'entertainment': '\ud83c\udfac \u5a31\u4e50',\n    'music': '\ud83c\udfb5 \u97f3\u4e50', 'movies': '\ud83c\udf9e\ufe0f \u7535\u5f71', 'documentary': '\ud83d\udcfd\ufe0f \u7eaa\u5b9e',\n    'kids': '\ud83d\udc76 \u5c11\u513f', 'education': '\ud83d\udcda \u6559\u80b2', 'religious': '\u26ea \u5b97\u6559',\n    'business': '\ud83d\udcbc \u5546\u4e1a', 'general': '\ud83d\udcfa \u7efc\u5408', 'lifestyle': '\ud83c\udf3f \u751f\u6d3b',\n    'science': '\ud83d\udd2c \u79d1\u6280', 'culture': '\ud83c\udfad \u6587\u5316', 'travel': '\u2708\ufe0f \u65c5\u6e38',\n    'series': '\ud83d\udcfa \u5267\u96c6', 'animation': '\ud83c\udfa8 \u52a8\u753b', 'comedy': '\ud83d\ude02 \u559c\u5267',\n    'weather': '\ud83c\udf24\ufe0f \u5929\u6c14', 'shopping': '\ud83d\udecd\ufe0f \u8d2d\u7269',\n  };\n  const seen = new Set();\n  for (const c of STATE.categories) {\n    if (seen.has(c.id)) continue;\n    seen.add(c.id);\n    const opt = document.createElement('option');\n    opt.value = c.id;\n    opt.textContent = CAT_NAMES[c.id] || c.name || c.id;\n    catSel.appendChild(opt);\n  }\n}\n\nfunction populateQuickPicks() {\n  const container = document.getElementById('quickPicks');\n  container.innerHTML = '<div class=\"quick-pick active\" data-code=\"\" onclick=\"selectQuickPick(this)\">\ud83c\udf0d \u5168\u90e8</div>';\n  for (const qc of QUICK_COUNTRIES) {\n    const div = document.createElement('div');\n    div.className = 'quick-pick';\n    div.dataset.code = qc.code;\n    div.textContent = `${FLAG_MAP[qc.code] || ''} ${qc.name}`;\n    div.onclick = () => selectQuickPick(div);\n    container.appendChild(div);\n  }\n}\n\nlet _quickPickActive = null;\n\nfunction selectQuickPick(el) {\n  // Toggle off if same one clicked\n  if (_quickPickActive === el) {\n    el.classList.remove('active');\n    _quickPickActive = null;\n    document.getElementById('countryFilter').value = '';\n    applyFilters();\n    return;\n  }\n\n  if (_quickPickActive) _quickPickActive.classList.remove('active');\n  el.classList.add('active');\n  _quickPickActive = el;\n\n  const code = el.dataset.code;\n  document.getElementById('countryFilter').value = code || '';\n  applyFilters();\n}\n\nfunction applyFilters() {\n  const countryCode = document.getElementById('countryFilter').value;\n  const category = document.getElementById('categoryFilter').value;\n  const search = document.getElementById('searchFilter').value.trim().toLowerCase();\n\n  let filtered = STATE.channels;\n\n  if (countryCode) {\n    filtered = filtered.filter(c => c.country === countryCode);\n  }\n  if (category) {\n    filtered = filtered.filter(c => c.categories && c.categories.includes(category));\n  }\n  if (search) {\n    filtered = filtered.filter(c =>\n      c.name.toLowerCase().includes(search) ||\n      c.id.toLowerCase().includes(search)\n    );\n  }\n  // Filter out channels with no available stream (dead or no stream at all)\n  if (document.getElementById('hideDeadFilter')?.checked) {\n    filtered = filtered.filter(c => c._verified !== 'dead' && c._primaryStream);\n  }\n\n  // Sort: channels with streams first, then by name\n  filtered.sort((a, b) => {\n    const aHas = a._primaryStream ? 1 : 0;\n    const bHas = b._primaryStream ? 1 : 0;\n    if (aHas !== bHas) return bHas - aHas;\n    return (a.name || '').localeCompare(b.name || '');\n  });\n\n  STATE.filtered = filtered;\n  renderChannels(filtered);\n}\n\n// ============================================================\n//  RENDER\n// ============================================================\nfunction renderChannels(channels) {\n  const grid = document.getElementById('channelGrid');\n\n  if (!channels.length) {\n    grid.innerHTML = `\n      <div class=\"empty-state\">\n        <div class=\"big-icon\">\ud83d\udcfa</div>\n        <p>\u6ca1\u6709\u627e\u5230\u5339\u914d\u7684\u9891\u9053</p>\n        <p style=\"font-size:12px;color:#999;margin-top:4px;\">\u8bd5\u8bd5\u5176\u4ed6\u7b5b\u9009\u6761\u4ef6</p>\n      </div>`;\n    updateStats();\n    return;\n  }\n\n  // Limit visible to prevent lag\n  const MAX_VISIBLE = 500;\n  const visible = channels.slice(0, MAX_VISIBLE);\n  const hiddenCount = channels.length - MAX_VISIBLE;\n\n  let html = '';\n  for (const ch of visible) {\n    const hasStream = !!ch._primaryStream;\n    const flag = FLAG_MAP[ch.country] || '';\n    const logo = ch.logo || ch.logo_url || '';\n    const cats = (ch.categories || []).slice(0, 2); // max 2 badges\n    const health = ch._verified || 'unknown';\n    const healthDot = hasStream ? `<span class=\"health-dot ${health}\" title=\"${\n      health === 'verified' ? '\u5df2\u9a8c\u8bc1\u53ef\u7528' : health === 'dead' ? '\u94fe\u63a5\u5df2\u5931\u6548' : '\u672a\u6d4b\u8bd5'\n    }\"></span>` : '';\n\n    html += `\n      <div class=\"channel-card ${hasStream ? '' : 'no-stream'}\"\n           onclick=\"${hasStream ? `playChannel('${escapeJS(ch.id)}')` : 'showToast(\\'\u274c \u8be5\u9891\u9053\u6682\u65e0\u53ef\u7528\u76f4\u64ad\u6d41\\', 2000)'}\"\n           title=\"${escapeHTML(ch.name)}${hasStream ? '\\n\u70b9\u51fb\u64ad\u653e' : '\\n\u6682\u65e0\u76f4\u64ad\u6d41'}\">\n        ${healthDot}\n        <div class=\"logo-wrap\">         ${logo ? `<img src=\"${escapeHTML(logo)}\" alt=\"\" loading=\"lazy\" onerror=\"this.parentElement.innerHTML='<span class=logo-fallback>\ud83d\udcfa</span>'\">`\n                 : '<span class=\"logo-fallback\">\ud83d\udcfa</span>'}\n        </div>\n        <div class=\"name\">${escapeHTML(ch.name)}</div>\n        <div class=\"country-tag\">${flag} ${ch.country}</div>\n        <div class=\"badges\">\n          ${cats.map(c => `<span class=\"badge\">${escapeHTML(c)}</span>`).join('')}\n          ${ch._primaryStream && ch._primaryStream.height >= 720 ? `<span class=\"badge hd-badge\">HD</span>` : ''}\n        </div>\n        ${hasStream ? '<div class=\"play-hint\">\u25b6\ufe0f \u64ad\u653e</div>' : ''}\n      </div>`;\n  }\n\n  if (hiddenCount > 0) {\n    html += `\n      <div class=\"empty-state\" style=\"padding:20px;\">\n        <p style=\"font-size:13px;\">\u8fd8\u6709 <strong>${hiddenCount.toLocaleString()}</strong> \u4e2a\u9891\u9053\u672a\u663e\u793a</p>\n        <p style=\"font-size:11px;color:#999;\">\u8bf7\u4f7f\u7528\u7b5b\u9009\u6761\u4ef6\u7f29\u5c0f\u8303\u56f4</p>\n      </div>`;\n  }\n\n  grid.innerHTML = html;\n  updateStats();\n}\n\n// ============================================================\n//  PLAYER\n// ============================================================\nfunction playChannel(channelId) {\n  const ch = STATE.channels.find(c => c.id === channelId);\n  if (!ch) return;\n\n  const stream = ch._primaryStream;\n  if (!stream) {\n    showToast('\u274c \u8be5\u9891\u9053\u6682\u65e0\u53ef\u7528\u76f4\u64ad\u6d41', 2000);\n    return;\n  }\n\n  STATE.currentChannel = { channel: ch, stream };\n\n  // Update player UI\n  const panel = document.getElementById('playerPanel');\n  panel.classList.remove('hidden');\n\n  document.getElementById('playerName').textContent = ch.name;\n  const flag = FLAG_MAP[ch.country] || '';\n  document.getElementById('playerMeta').textContent =\n    `${flag} ${ch.country} \u00b7 ${(ch.categories || []).join(', ') || '\u7efc\u5408'}`;\n\n  const logo = ch.logo || ch.logo_url || '';\n  const logoEl = document.getElementById('playerLogo');\n  if (logo) {\n    logoEl.src = logo;\n    logoEl.style.display = '';\n  } else {\n    logoEl.style.display = 'none';\n  }\n\n  // Set VLC link\n  document.getElementById('vlcLink').href = stream.url;\n\n  setPlayerStatus('buffering', '\u23f3 \u52a0\u8f7d\u4e2d...');\n  startPlayback(stream);\n}\n\nfunction startPlayback(stream) {\n  const video = document.getElementById('playerVideo');\n  const url = stream.url;\n\n  // Destroy any existing hls instance\n  if (STATE.hls) {\n    STATE.hls.destroy();\n    STATE.hls = null;\n  }\n\n  // Check User-Agent / Referrer requirements\n  const ua = stream.http_user_agent;\n  const ref = stream.http_referrer;\n\n  if (ua || ref) {\n    console.log(`Stream may need UA=${ua} or Referer=${ref}`);\n    // Show a subtle hint\n    document.getElementById('playerMeta').textContent +=\n      document.getElementById('playerMeta').textContent.includes('\u26a0\ufe0f') ? '' : ' \u00b7 \u26a0\ufe0f \u53ef\u80fd\u9700\u8981\u7279\u6b8aUA';\n  }\n\n  if (url.endsWith('.m3u8') && Hls.isSupported()) {\n    const hls = new Hls({\n      enableWorker: true,\n      lowLatencyMode: true,\n      backbufferLength: 30,\n      maxBufferLength: 30,\n    });\n    STATE.hls = hls;\n    hls.loadSource(url);\n    hls.attachMedia(video);\n    hls.on(Hls.Events.MANIFEST_PARSED, () => {\n      video.play().catch(() => {});\n      setPlayerStatus('playing', '\u25b6\ufe0f \u64ad\u653e\u4e2d');\n    });\n    hls.on(Hls.Events.ERROR, (e, data) => {\n      if (data.fatal) {\n        setPlayerStatus('error', '\u274c \u64ad\u653e\u5931\u8d25');\n        console.error('HLS fatal error:', data);\n      }\n    });\n  } else if (url.endsWith('.m3u8') && video.canPlayType('application/vnd.apple.mpegurl')) {\n    // Native HLS support (Safari/iOS)\n    video.src = url;\n    video.play().catch(() => {});\n    setPlayerStatus('playing', '\u25b6\ufe0f \u64ad\u653e\u4e2d');\n  } else {\n    // Direct stream (MP4, etc.)\n    video.src = url;\n    video.play().catch(() => {\n      setPlayerStatus('error', '\u274c \u65e0\u6cd5\u64ad\u653e');\n    });\n    video.onerror = () => {\n      setPlayerStatus('error', '\u274c \u64ad\u653e\u5931\u8d25');\n    };\n    video.oncanplay = () => {\n      setPlayerStatus('playing', '\u25b6\ufe0f \u64ad\u653e\u4e2d');\n    };\n  }\n\n  video.onwaiting = () => setPlayerStatus('buffering', '\u23f3 \u7f13\u51b2\u4e2d...');\n  video.onplaying = () => setPlayerStatus('playing', '\u25b6\ufe0f \u64ad\u653e\u4e2d');\n  video.onpause = () => setPlayerStatus('paused', '\u23f8\ufe0f \u5df2\u6682\u505c');\n  video.onended = () => setPlayerStatus('paused', '\u23f9\ufe0f \u5df2\u7ed3\u675f');\n}\n\nfunction setPlayerStatus(type, text) {\n  const el = document.getElementById('playerStatus');\n  el.className = 'player-status' + (type === 'error' ? ' error' : '') +\n    (type === 'buffering' ? ' buffering' : '');\n  el.textContent = text;\n}\n\nfunction closePlayer() {\n  if (STATE.hls) {\n    STATE.hls.destroy();\n    STATE.hls = null;\n  }\n  const video = document.getElementById('playerVideo');\n  video.pause();\n  video.src = '';\n  video.load();\n  document.getElementById('playerPanel').classList.add('hidden');\n  STATE.currentChannel = null;\n}\n\nfunction togglePlayerMute() {\n  const video = document.getElementById('playerVideo');\n  video.muted = !video.muted;\n  document.getElementById('muteBtn').textContent = video.muted ? '\ud83d\udd07' : '\ud83d\udd0a';\n}\n\n// ============================================================\n//  UTILITIES\n// ============================================================\nfunction escapeHTML(str) {\n  if (!str) return '';\n  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')\n    .replace(/\"/g,'&quot;').replace(/'/g,'&#39;');\n}\n\nfunction escapeJS(str) {\n  return str.replace(/\\\\/g,'\\\\\\\\').replace(/'/g,\"\\\\'\").replace(/\"/g,'\\\\\"');\n}\n\nlet toastTimer = null;\nfunction showToast(msg, duration) {\n  const el = document.getElementById('toast');\n  el.textContent = msg;\n  el.classList.add('show');\n  clearTimeout(toastTimer);\n  toastTimer = setTimeout(() => el.classList.remove('show'), duration || 2000);\n}\n\n// Keyboard shortcut: Escape to close player\ndocument.addEventListener('keydown', (e) => {\n  if (e.key === 'Escape' && !document.getElementById('playerPanel').classList.contains('hidden')) {\n    closePlayer();\n  }\n});\n\n// ============================================================\n//  INIT\n// ============================================================\n\n// Start loading data directly (Cloudflare deploys the latest version)\nloadAllData();\n</script>\n</body>\n</html>\n";
var COOKIE_NAME
var COOKIE_NAME
var COOKIE_NAME
var COOKIE_NAME = "site_pw";

function checkAuth(request) {
  var url = new URL(request.url);
  // Skip auth for static assets (images, css, js)
  if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|css|js|mp4|webm|pdf|docx)$/i)) return true;
  // Skip API routes
  if (url.pathname.startsWith("/api/")) return true;
  // Skip flight monitor pages
  if (url.pathname.startsWith("/flight-monitor") || url.pathname.startsWith("/spring-monitor") || url.pathname.startsWith("/thai-monitor")) return true;
  // Skip public pages
  if (url.pathname === "/countdown.html" || url.pathname === "/countdown") return true;
  // Skip thailand itinerary page (public)
  if (url.pathname.startsWith("/thailand/") || url.pathname === "/thailand") return true;

  // Check query param
  if (url.searchParams.get("pw") === PASSWORD) return true;

  // Check cookie
  var cookie = request.headers.get("Cookie") || "";
  if (cookie.indexOf(COOKIE_NAME + "=" + PASSWORD) >= 0) return true;

  return false;
}

var LOGIN_PAGE = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>验证</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a1a2e,#16213e);font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif}.box{background:#fff;border-radius:20px;padding:40px 36px;text-align:center;max-width:380px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.3)}h1{font-size:22px;color:#1a1a2e;margin-bottom:6px}p{font-size:14px;color:#666;margin-bottom:24px}.input-wrap{position:relative;margin-bottom:20px}input{width:100%;padding:14px 16px;border:2px solid #e0e0e0;border-radius:12px;font-size:18px;text-align:center;outline:none;box-sizing:border-box;letter-spacing:6px;font-weight:700}input:focus{border-color:#6c5ce7}button{width:100%;padding:14px;background:linear-gradient(135deg,#2d1b69,#6c5ce7);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer}button:hover{opacity:.9}.error{color:#e53e3e;font-size:13px;margin-top:10px;display:none}</style></head><body><div class="box"><h1>🔐 请输入访问密码</h1><p>2026暑假 · 马来西亚亲子游</p><form method="GET"><div class="input-wrap"><input type="password" name="pw" placeholder="输入密码" autofocus></div><button type="submit">验证</button><div class="error" id="error">密码错误，请重试</div></form></div><script>var err=new URLSearchParams(location.search).get("error");if(err){document.getElementById("error").style.display="block"}</script></body></html>';

var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;

    // Password protection
    if (!checkAuth(request)) {
      var url = new URL(request.url);
      var pw = url.searchParams.get("pw");
      if (pw === PASSWORD) {
        // Set cookie and redirect to clean URL
        var cleanUrl = url.origin + url.pathname;
        return new Response("", {
          status: 302,
          headers: {
            "Location": cleanUrl,
            "Set-Cookie": COOKIE_NAME + "=" + PASSWORD + "; Path=/; Max-Age=2592000; SameSite=Lax; Secure"
          }
        });
      }
      if (pw && pw !== PASSWORD) {
        return new Response(LOGIN_PAGE.replace('style="display:none"', 'style="display:block"'), {
          headers: { "Content-Type": "text/html;charset=utf-8" }
        });
      }
      return new Response(LOGIN_PAGE, {
        headers: { "Content-Type": "text/html;charset=utf-8" }
      });
    }

    // Serve static pages from GitHub raw content (fallback when ASSETS doesn't have them)
    var _staticUrl = new URL(request.url);
    if (_staticUrl.pathname === "/spring-monitor" || _staticUrl.pathname === "/spring-monitor.html") {
      try {
        var _ghResp = await fetch("https://raw.githubusercontent.com/stevenzhu1982/family-trip-2026/master/site/spring-monitor.html");
        if (_ghResp.ok) return new Response(_ghResp.body, { headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "public,max-age=300" }});
      } catch(e) {}
    }
    if (_staticUrl.pathname === "/flight-monitor" || _staticUrl.pathname === "/flight-monitor.html") {
      try {
        var _fhResp = await fetch("https://raw.githubusercontent.com/stevenzhu1982/family-trip-2026/master/site/flight-monitor.html");
        if (_fhResp.ok) return new Response(_fhResp.body, { headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "public,max-age=300" }});
      } catch(e) {}
    }
    // Thai Airways monitoring (if it exists)
    if (_staticUrl.pathname === "/thai-monitor" || _staticUrl.pathname === "/thai-monitor.html") {
      return new Response("", { status: 302, headers: { "Location": "https://raw.githubusercontent.com/stevenzhu1982/family-trip-2026/master/site/spring-monitor.html#THAI" }});
    }

    // IPTV TV page: /TV and /tv.html redirect to GitHub Pages (or serve embedded HTML)
    var _tvUrl = new URL(request.url);
    if (_tvUrl.pathname === "/TV" || _tvUrl.pathname === "/TV/" || _tvUrl.pathname === "/tv.html") {
      try {
        var _tvResult = new Response(TV_HTML, {
          headers: { "Content-Type": "text/html;charset=utf-8" }
        });
        _tvResult.headers.append("Set-Cookie", COOKIE_NAME + "=" + PASSWORD + "; Path=/; Max-Age=2592000; SameSite=Lax; Secure");
        return _tvResult;
      } catch(e) {
        // Fallback: redirect to GitHub Pages TV page
        return new Response("", {
          status: 302,
          headers: { "Location": "https://stevenzhu1982.github.io/family-trip-2026/" }
        });
      }
    }

    // Cookie header that refreshes on every response (30 day expiry)
    var COOKIE_HEADER = COOKIE_NAME + "=" + PASSWORD + "; Path=/; Max-Age=2592000; SameSite=Lax; Secure";

    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        response.headers.append("Set-Cookie", COOKIE_HEADER);
        return cloneResponse(response);
      } else if ("ASSETS") {
        var assetResp = await env["ASSETS"].fetch(request);
        var respWithCookie = new Response(assetResp.body, assetResp);
        respWithCookie.headers.append("Set-Cookie", COOKIE_HEADER);
        return respWithCookie;
      } else {
        var fetchResp = await fetch(request);
        var respWithCookie2 = new Response(fetchResp.body, fetchResp);
        respWithCookie2.headers.append("Set-Cookie", COOKIE_HEADER);
        return respWithCookie2;
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
