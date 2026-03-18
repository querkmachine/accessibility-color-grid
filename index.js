import * as dotenv from "dotenv";
import express from "express";
import nunjucks from "nunjucks";
import wcagContrast from "wcag-contrast";

dotenv.config();

const app = express();
app.set("view engine", "njk");
app.use(express.urlencoded());

const njkEnv = nunjucks.configure("views", {
  autoescape: true,
  express: app,
});

const normaliseHexFormatting = function (colorArray, includeHashInOutput) {
  colorArray = colorArray.map((c) => {
    c = c.trim();

    // Remove initial hash sign for purposes of further tests
    c = c.startsWith("#") ? c.slice(1) : c;

    // Truncate to 6 characters max (we don't do alphas here)
    return c.substring(0, 6).toUpperCase();
  });

  // Remove any invalid hex values
  // - must be uppercase (enforced by above line)
  // - must be hexadecimal
  // - must be 3 or 6 characters long
  colorArray = colorArray.filter((c) => {
    const pattern = /^([A-F0-9]{3}){1,2}$/;
    return pattern.test(c);
  });

  if (includeHashInOutput) {
    colorArray = colorArray.map((c) => `#${c}`);
  }

  return colorArray;
};

const generateExampleColors = function () {
  const output = [];

  for (let i = 0; i < 10; i++) {
    output.push(Math.random().toString(16).slice(2, 8));
  }

  return normaliseHexFormatting(output, true);
};

njkEnv.addGlobal("contastRatio", (c1, c2) => {
  return Intl.NumberFormat("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(wcagContrast.hex(c1, c2));
});

njkEnv.addGlobal("grade", (c1, c2) => {
  const ratio = wcagContrast.hex(c1, c2);
  if (ratio >= 7) {
    return "AAA";
  } else if (ratio >= 4.5) {
    return "AA";
  } else if (ratio >= 3) {
    return "AAL";
  } else {
    return "Fail";
  }
});

app.use("/static", express.static("static"));

app.get("/", (req, res) => {
  let colors = [];

  if (req.query.colors) {
    colors = normaliseHexFormatting(req.query.colors.split(","), true);
  } else {
    colors = generateExampleColors();
  }

  res.render("index", { colors });
});

app.post("/", (req, res) => {
  let colors = req.body.colors ? req.body.colors.split("\n") : [];
  colors = normaliseHexFormatting(colors, false);
  res.redirect(`/?colors=${colors.join(",")}`);
});

app.listen(process.env.PORT, () => {
  console.log(`Running on http://localhost:${process.env.PORT}`);
});
