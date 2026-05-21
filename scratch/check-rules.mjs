import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

console.log("=== NEXT VITALS ===");
nextVitals.forEach((config, idx) => {
  if (config.rules) {
    const rules = Object.keys(config.rules).filter(r => r.includes("compiler") || r.includes("react"));
    if (rules.length > 0) {
      console.log(`Config ${idx}:`, rules);
      rules.forEach(r => console.log(`  ${r}:`, config.rules[r]));
    }
  }
});

console.log("=== NEXT TS ===");
nextTs.forEach((config, idx) => {
  if (config.rules) {
    const rules = Object.keys(config.rules).filter(r => r.includes("compiler") || r.includes("react"));
    if (rules.length > 0) {
      console.log(`Config ${idx}:`, rules);
      rules.forEach(r => console.log(`  ${r}:`, config.rules[r]));
    }
  }
});
