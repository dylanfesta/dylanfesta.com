import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { HtmlBasePlugin } from "@11ty/eleventy";
import yaml from "js-yaml";
import katex from "katex";

/**
 * Register inline ($...$) and block ($$...$$) LaTeX rules on markdown-it
 * so subscripts (_) and asterisks (*) inside math are never mangled by Markdown.
 */
function registerKatexMarkdown(md) {
  // Inline math: $...$
  md.inline.ruler.after("escape", "math_inline", (state, silent) => {
    if (state.src[state.pos] !== "$") return false;
    // Ignore $$ (handled by block or display inline) and escaped \$
    if (state.src[state.pos + 1] === "$") return false;

    const start = state.pos + 1;
    // Require non-space right after opening $
    if (start >= state.posMax || /\s/.test(state.src[start])) return false;

    let match = start;
    while ((match = state.src.indexOf("$", match)) !== -1) {
      // Skip escaped \$
      let backslashes = 0;
      let p = match - 1;
      while (p >= start && state.src[p] === "\\") {
        backslashes++;
        p--;
      }
      if (backslashes % 2 === 0) break;
      match++;
    }

    if (match === -1 || match === start) return false;
    // Require non-space right before closing $
    if (/\s/.test(state.src[match - 1])) return false;

    if (!silent) {
      const token = state.push("math_inline", "math", 0);
      token.markup = "$";
      token.content = state.src.slice(start, match);
    }
    state.pos = match + 1;
    return true;
  });

  // Display math: $$...$$ (both single-line and multi-line blocks)
  md.block.ruler.after(
    "blockquote",
    "math_block",
    (state, startLine, endLine, silent) => {
      let pos = state.bMarks[startLine] + state.tShift[startLine];
      let max = state.eMarks[startLine];

      if (pos + 2 > max || state.src.slice(pos, pos + 2) !== "$$") return false;
      pos += 2;
      let firstLine = state.src.slice(pos, max);

      if (silent) return true;

      let foundSingleLine = false;
      if (firstLine.trim().endsWith("$$") && firstLine.trim().length >= 2) {
        const trimmed = firstLine.trim();
        // Handle $$ expr $$ on a single line (when trimmed !== "$$" or pos had content)
        if (trimmed.length > 2 || firstLine.indexOf("$$") !== -1) {
          firstLine = trimmed.slice(0, -2);
          foundSingleLine = true;
        }
      }

      let nextLine = startLine;
      let lastLine = "";
      if (!foundSingleLine) {
        while (++nextLine < endLine) {
          pos = state.bMarks[nextLine] + state.tShift[nextLine];
          max = state.eMarks[nextLine];
          const lineText = state.src.slice(pos, max);
          if (lineText.trim().endsWith("$$")) {
            lastLine = lineText.slice(0, lineText.lastIndexOf("$$"));
            break;
          }
        }
      }

      state.line = nextLine + 1;
      const token = state.push("math_block", "math", 0);
      token.block = true;
      token.markup = "$$";
      if (foundSingleLine) {
        token.content = firstLine.trim();
      } else {
        const middle = state.getLines(startLine + 1, nextLine, state.tShift[startLine], true);
        token.content = (
          (firstLine.trim() ? firstLine + "\n" : "") +
          middle +
          lastLine
        ).trim();
      }
      token.map = [startLine, state.line];
      return true;
    },
    { alt: ["paragraph", "reference", "blockquote", "list"] }
  );

  md.renderer.rules.math_inline = (tokens, idx) =>
    katex.renderToString(tokens[idx].content, {
      displayMode: false,
      throwOnError: false,
    });

  md.renderer.rules.math_block = (tokens, idx) =>
    `<div class="math-display">${katex.renderToString(tokens[idx].content, {
      displayMode: true,
      throwOnError: false,
    })}</div>\n`;
}

function readSiteConfig() {
  const siteYamlPath = path.resolve("src/_data/site.yaml");
  if (!existsSync(siteYamlPath)) return { pathPrefix: "/" };
  return yaml.load(readFileSync(siteYamlPath, "utf8")) || { pathPrefix: "/" };
}

export default function (eleventyConfig) {
  const siteConfig = readSiteConfig();
  const rawPrefix = process.env.PATH_PREFIX || siteConfig.pathPrefix || "/";
  const normalizedPrefix =
    rawPrefix === "/"
      ? "/"
      : `/${rawPrefix.replace(/^\/+|\/+$/g, "")}/`;

  const subDir = normalizedPrefix === "/" ? "" : normalizedPrefix.replace(/^\/+|\/+$/g, "");
  const outputDir = subDir ? path.posix.join("_site", subDir) : "_site";

  // Enable YAML files in src/_data/
  eleventyConfig.addDataExtension("yaml,yml", (contents) => yaml.load(contents));

  // Automatically rewrite internal links/assets when deployed under a subpath (e.g. /alpha-version/)
  eleventyConfig.addPlugin(HtmlBasePlugin);

  // Build-time LaTeX math via KaTeX (zero client-side JS needed for equations)
  eleventyConfig.amendLibrary("md", (md) => {
    registerKatexMarkdown(md);
  });

  // Also provide a Nunjucks filter for inline math inside YAML strings if ever desired
  eleventyConfig.addFilter("katexInline", (str) =>
    katex.renderToString(String(str), { displayMode: false, throwOnError: false })
  );

  eleventyConfig.addFilter("readableDate", (dateObj) => {
    const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
    return d.toISOString().slice(0, 10);
  });

  // Static assets passthrough
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy({
    "node_modules/katex/dist/katex.min.css": "assets/vendor/katex/katex.min.css",
    "node_modules/katex/dist/fonts": "assets/vendor/katex/fonts",
    "node_modules/@oddbird/popover-polyfill/dist/popover.min.js":
      "assets/vendor/popover.min.js",
  });

  // Notes collection sorted newest-first
  eleventyConfig.addCollection("notes", (collectionApi) =>
    collectionApi
      .getFilteredByGlob("src/notes/*.md")
      .sort((a, b) => b.date - a.date)
  );

  // Demos collection
  eleventyConfig.addCollection("demos", (collectionApi) =>
    collectionApi.getFilteredByGlob("src/demos/*.md")
  );

  // When publishing a preview at /alpha-version/, write a minimal root _site/index.html
  // so dylanfesta.com/ shows a clean stub while dylanfesta.com/alpha-version/ serves the site.
  eleventyConfig.on("eleventy.after", () => {
    if (normalizedPrefix === "/") return;
    mkdirSync("_site", { recursive: true });
    const rootStub = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="robots" content="noindex">
  <title>${siteConfig.title || "Dylan Festa"}</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
    body {
      min-block-size: 100dvh; margin: 0; display: grid; place-items: center;
      padding: 2rem; text-align: center; line-height: 1.6;
    }
    p { opacity: 0.75; margin-block-start: 0.4rem; }
  </style>
</head>
<body>
  <main>
    <h1>${siteConfig.title || "Dylan Festa"}</h1>
    <p>Website under construction.</p>
  </main>
</body>
</html>
`;
    writeFileSync(path.resolve("_site/index.html"), rootStub, "utf8");
  });

  return {
    pathPrefix: normalizedPrefix,
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: outputDir,
    },
  };
}
