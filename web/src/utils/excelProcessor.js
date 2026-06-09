import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

export function extractNumeric(txt) {
  if (txt === null || txt === undefined) return null;
  if (typeof txt === 'number') return txt;
  const match = /-?\d+(?:\.\d+)?/.exec(String(txt));
  return match ? parseFloat(match[0]) : null;
}

export function normalizeDescription(desc) {
  if (desc === null || desc === undefined) return "";
  let text = String(desc).trim();
  if (text.includes(",")) {
    text = text.split(",")[0].trim();
  }
  return text;
}

export function resolveSpecValue(rawSpec, vccValue, vioValue, itemName) {
  if (rawSpec === null || rawSpec === undefined) return null;
  if (typeof rawSpec === 'number') return rawSpec;
  
  let specText = String(rawSpec).trim();
  if (!specText) return null;
  
  let specUpper = specText.toUpperCase().replace(/\s+/g, '');
  let hasExpr = specUpper.includes("VCC") || specUpper.includes("VIO");
  let itemUpper = String(itemName).trim().toUpperCase();
  const exprItems = new Set(["VIL", "VIH", "VOH SINGLE", "VOH DUAL", "VOH QUAD", "VOH QUAL"]);
  const keepVUnitItems = new Set(["VIH", "VOH SINGLE", "VOH DUAL", "VOH QUAD", "VOH QUAL"]);
  
  if (hasExpr && exprItems.has(itemUpper)) {
    const vccNum = extractNumeric(vccValue);
    const vioNum = extractNumeric(vioValue);
    let expr = specUpper;
    
    if (expr.includes("VCC")) {
      if (vccNum === null) return null;
      expr = expr.replace(/VCC/g, String(vccNum));
    }
    if (expr.includes("VIO")) {
      if (vioNum === null) return null;
      expr = expr.replace(/VIO/g, String(vioNum));
    }
    
    if (!/^[0-9\.+\-*/()]+$/.test(expr)) {
      return extractNumeric(specText);
    }
    
    try {
      let specValue = Function(`"use strict"; return (${expr})`)();
      if (keepVUnitItems.has(itemUpper)) {
        return specValue;
      }
      if (itemUpper === "VIL") {
        specValue *= 1000.0;
      }
      return specValue;
    } catch (e) {
      return extractNumeric(specText);
    }
  }
  return extractNumeric(specText);
}

export function getGroup(itemName) {
  if (!itemName) return "Time";
  const itemStr = String(itemName).trim();
  const itemUpper = itemStr.toUpperCase();
  
  if (itemStr.includes("fR")) return "Normal Read";
  if (["-0D", "-ED", "-BD", "-EE"].some(tag => itemUpper.includes(tag))) return "DTR read";
  if (itemStr.includes("FR") || itemStr.includes("tCLQV")) return "Except NR/DTR";
  
  if (
    itemUpper.includes("ICC") ||
    itemUpper.startsWith("VIH") ||
    itemUpper.startsWith("VIL") ||
    itemUpper.startsWith("VOH") ||
    itemUpper.startsWith("VOL")
  ) {
    return "DC";
  }
  return "Time";
}

export function getJudge(val, specMin, specMax, ftJudge, itemName) {
  if (val === null || val === undefined || ftJudge === null || ftJudge === undefined) return null;
  const judgeCriteria = String(ftJudge).trim();
  const itemUpper = String(itemName).trim().toUpperCase();
  
  const valNum = parseFloat(val);
  if (isNaN(valNum)) return null;
  
  function nonZeroSpec(spec) {
    if (spec === null || spec === undefined || spec === "") return null;
    const num = parseFloat(spec);
    return isNaN(num) || num === 0 ? null : num;
  }
  
  if (itemUpper === "VIL" && specMax !== null && specMax !== undefined) {
    return specMax < valNum ? 'Pass' : 'Fail';
  }
  if (itemUpper === "VIH" && specMax !== null && specMax !== undefined) {
    if (judgeCriteria === '>') return specMax > valNum ? 'Pass' : 'Fail';
    if (judgeCriteria === '<') return valNum < specMax ? 'Pass' : 'Fail';
  }
  
  const specMinNonZero = nonZeroSpec(specMin);
  const specMaxNonZero = nonZeroSpec(specMax);
  
  if (specMinNonZero !== null && specMaxNonZero !== null) {
    return (valNum > specMinNonZero && valNum < specMaxNonZero) ? 'Pass' : 'Fail';
  }
  
  const specVal = specMaxNonZero !== null ? specMaxNonZero : specMinNonZero;
  if (specVal !== null) {
    if (judgeCriteria === '<') return specVal < valNum ? 'Pass' : 'Fail';
    if (judgeCriteria === '>') return specVal > valNum ? 'Pass' : 'Fail';
  }
  return null;
}

export function getTypJudge(val, specTyp, metric, temp, vcc) {
  if (val === null || val === undefined || specTyp === null || specTyp === undefined || specTyp === 0 || specTyp === "") return "";
  if (String(metric).trim() !== "Average") return "";
  
  const tempNum = extractNumeric(temp);
  const vccNum = extractNumeric(vcc);
  if (tempNum !== 25) return "";
  if (vccNum !== 1.2 && vccNum !== 1.8 && vccNum !== 3.0) return "";
  
  const specTypNum = parseFloat(specTyp);
  if (isNaN(specTypNum) || specTypNum === 0) return "";
  
  return parseFloat(val) > specTypNum * 1.2 ? "Fail" : "Pass";
}

export function calculateValueSpecRatio(val, specMin, specMax, judgeCriteria, itemName) {
  if (val === null || val === undefined || judgeCriteria === null || judgeCriteria === undefined) return null;
  
  const itemUpper = String(itemName).trim().toUpperCase();
  const criteria = String(judgeCriteria).trim();
  const valueNum = parseFloat(val);
  if (isNaN(valueNum)) return null;
  
  const specMinNum = (specMin === null || specMin === undefined || specMin === "") ? null : parseFloat(specMin);
  const specMaxNum = (specMax === null || specMax === undefined || specMax === "") ? null : parseFloat(specMax);
  
  if (itemUpper === "VIL" || itemUpper === "VIH") {
    if (specMaxNum === null || isNaN(specMaxNum) || specMaxNum === 0) return null;
    if (criteria === ">") return valueNum ? Math.abs(specMaxNum / valueNum) : null;
    if (criteria === "<") return Math.abs(valueNum / specMaxNum);
    return null;
  }
  
  const refSpec = (specMaxNum !== null && !isNaN(specMaxNum) && specMaxNum !== 0) ? specMaxNum : specMinNum;
  if (refSpec === null || isNaN(refSpec) || refSpec === 0) return null;
  
  if (criteria === ">") return valueNum ? Math.abs(refSpec / valueNum) : null;
  if (criteria === "<") return Math.abs(valueNum / refSpec);
  return null;
}

export function determineFailedSpec(val, specMin, specMax, judgeCriteria, itemName) {
  if (val === null || val === undefined) return null;
  const itemUpper = String(itemName).trim().toUpperCase();
  const valueNum = parseFloat(val);
  if (isNaN(valueNum)) return null;
  
  const specMinNum = (specMin === null || specMin === undefined || specMin === "") ? null : parseFloat(specMin);
  const specMaxNum = (specMax === null || specMax === undefined || specMax === "") ? null : parseFloat(specMax);
  
  if ((itemUpper === "VIL" || itemUpper === "VIH") && specMaxNum !== null && !isNaN(specMaxNum)) {
    return "Max";
  }
  
  if (specMinNum !== null && !isNaN(specMinNum) && specMinNum !== 0 && specMaxNum !== null && !isNaN(specMaxNum) && specMaxNum !== 0) {
    if (valueNum <= specMinNum) return "Min";
    if (valueNum >= specMaxNum) return "Max";
    return "Min/Max";
  }
  
  if (specMaxNum !== null && !isNaN(specMaxNum) && specMaxNum !== 0) return "Max";
  if (specMinNum !== null && !isNaN(specMinNum) && specMinNum !== 0) return "Min";
  return null;
}

// core parsing function for uploaded file buffers
export async function parseExcelFiles(files, onProgress) {
  const validSheets = ["90", "130", "110", "25", "-45", "90C", "130C", "110C", "25C", "-45C"];
  const transferRecords = [];
  const specDict = {};
  const itemSet = new Set();
  
  let totalFiles = files.length;
  
  for (let fIdx = 0; fIdx < files.length; fIdx++) {
    const fileObj = files[fIdx];
    const dataBuffer = await fileObj.arrayBuffer();
    const workbook = XLSX.read(dataBuffer, { type: 'array', cellFormula: false });
    
    const product = fileObj.name.split('_')[0];
    
    for (let sheetName of workbook.SheetNames) {
      if (!validSheets.includes(sheetName)) continue;
      
      const ws = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
      
      // Find Cout row
      let keyRow = -1;
      for (let r = 0; r < sheetData.length; r++) {
        if (sheetData[r] && sheetData[r][0] && String(sheetData[r][0]).includes('Cout')) {
          keyRow = r;
          break;
        }
      }
      
      if (keyRow === -1) {
        throw new Error(`檔案 ${fileObj.name} 的分頁 ${sheetName} 中找不到 'Cout' 定位標記。`);
      }
      
      // Find columns for Min, Typ, Max, Judge in header row (keyRow - 3)
      const headerRowIdx = keyRow - 3;
      const headerRow = sheetData[headerRowIdx] || [];
      
      let minCol = -1, typCol = -1, maxCol = -1, judgeCol = -1;
      for (let c = 0; c < headerRow.length; c++) {
        const val = headerRow[c];
        if (val) {
          const valStr = String(val).trim();
          if (valStr.includes('Min')) minCol = c;
          else if (valStr.includes('Typ') || valStr.includes('Typical')) typCol = c;
          else if (valStr.includes('Max')) maxCol = c;
          else if (valStr.includes('Judge')) judgeCol = c;
        }
      }
      
      // Parse spec values
      const itemInfo = [];
      let rowIdx = keyRow + 1;
      while (rowIdx < sheetData.length) {
        const row = sheetData[rowIdx];
        if (!row || !row[0]) break; // Empty Symbol cell stops the loop
        
        const symbol = String(row[0]).trim();
        const descVal = row[3];
        const descClean = descVal === null || descVal === undefined ? "" : String(descVal).trim();
        
        const rawMin = minCol !== -1 ? row[minCol] : null;
        const rawTyp = typCol !== -1 ? row[typCol] : null;
        const rawMax = maxCol !== -1 ? row[maxCol] : null;
        const rawJudge = judgeCol !== -1 ? row[judgeCol] : null;
        const ftJudge = rawJudge !== null ? String(rawJudge).trim() : null;
        
        specDict[`${product}|||${sheetName}|||${symbol}|||${descClean}`] = {
          rawMin, rawTyp, rawMax, ftJudge
        };
        
        itemInfo.push({ symbol, descClean });
        rowIdx++;
      }
      
      // Read data columns from column index 23 (Column X) onwards
      const vccValues = (sheetData[2] || []).slice(23);
      const vioValues = (sheetData[3] || []).slice(23);
      
      // Find last data row
      let lastDataRow = 6;
      for (let r = 6; r < sheetData.length; r++) {
        if (sheetData[r] && sheetData[r][23] !== null && sheetData[r][23] !== undefined) {
          lastDataRow = r;
        }
      }
      
      const dataRows = sheetData.slice(6, lastDataRow + 1);
      
      // Transpose columns (each column corresponds to a test run)
      const numColumns = vccValues.length;
      for (let colIdx = 0; colIdx < numColumns; colIdx++) {
        const vccVal = vccValues[colIdx];
        const vioVal = vioValues[colIdx];
        
        for (let itemIdx = 0; itemIdx < itemInfo.length; itemIdx++) {
          const { symbol, descClean } = itemInfo[itemIdx];
          const rowData = dataRows[itemIdx] || [];
          const value = rowData[23 + colIdx];
          
          // Determine 4 byte alignment
          const descLower = descClean.toLowerCase();
          const symbolUpper = symbol.toUpperCase();
          let alignment = "NA";
          if (descLower.startsWith('start add')) {
            if (descLower.startsWith('start add #3ff') || descLower.startsWith('start add #003') || descLower.startsWith('start add #1ff')) {
              alignment = "No";
            } else {
              alignment = "Yes";
            }
          } else if (symbolUpper.includes('=#1FF')) {
            alignment = "No";
          }
          
          transferRecords.push({
            product,
            temp: sheetName,
            vcc: vccVal,
            vio: vioVal,
            description: descClean,
            alignment,
            item: symbol,
            value: value
          });
        }
      }
    }
    
    if (onProgress) {
      onProgress(Math.floor((fIdx + 1) / totalFiles * 70));
    }
  }
  
  // Calculate Statistics
  const stats = {};
  for (let r of transferRecords) {
    if (r.item === null || r.item === undefined) continue;
    const val = extractNumeric(r.value);
    
    const key = `${r.product}|||${r.temp}|||${r.vcc}|||${r.vio}`;
    const itemKey = `${r.item}|||${r.description}`;
    
    if (!stats[key]) stats[key] = {};
    if (!stats[key][itemKey]) {
      stats[key][itemKey] = {
        sum: 0,
        count: 0,
        max: -Infinity,
        min: Infinity,
        alignment: r.alignment
      };
    }
    
    const rec = stats[key][itemKey];
    if (val !== null) {
      rec.sum += val;
      rec.count += 1;
      rec.max = Math.max(rec.max, val);
      rec.min = Math.min(rec.min, val);
    }
  }
  
  if (onProgress) onProgress(80);
  
  // Create Compare Records
  const compareRecords = [];
  const specRowMap = {};
  const datasheetSpecs = [];
  let nextSpecRow = 2;
  
  for (let key of Object.keys(stats)) {
    const partsKey = key.split('|||');
    const product = partsKey[0];
    const temp = partsKey[1];
    const vcc = partsKey[2];
    const vio = partsKey[3];
    const items = stats[key];
    
    for (let itemKey of Object.keys(items)) {
      const partsItem = itemKey.split('|||');
      const item_name = partsItem[0];
      const description = partsItem[1] || '';
      const rec = items[itemKey];
      
      const specKey = `${product}|||${temp}|||${item_name}|||${description}`;
      const specData = specDict[specKey] || { rawMin: null, rawTyp: null, rawMax: null, ftJudge: null };
      const group = getGroup(item_name);
      
      const specMin = resolveSpecValue(specData.rawMin, vcc, vio, item_name);
      const specTyp = resolveSpecValue(specData.rawTyp, vcc, vio, item_name);
      const specMax = resolveSpecValue(specData.rawMax, vcc, vio, item_name);
      
      // Map to datasheet specs
      const datasheetKey = `${item_name}_${normalizeDescription(description)}_${rec.alignment}`;
      let specRow = specRowMap[datasheetKey];
      if (specRow === undefined) {
        specRow = nextSpecRow;
        specRowMap[datasheetKey] = specRow;
        datasheetSpecs.push({
          rowIdx: specRow,
          item: item_name,
          description: normalizeDescription(description),
          alignment: rec.alignment,
          min: specMin,
          typ: specTyp,
          max: specMax
        });
        nextSpecRow++;
      }
      
      const metrics = [
        { metric: "Average", value: rec.count ? (rec.sum / rec.count) : null },
        { metric: "Max", value: rec.max !== -Infinity ? rec.max : null },
        { metric: "Min", value: rec.min !== Infinity ? rec.min : null }
      ];
      
      for (let m of metrics) {
        const judge = getJudge(m.value, specMin, specMax, specData.ftJudge, item_name);
        const typJudge = getTypJudge(m.value, specTyp, m.metric, temp, vcc);
        const ratio = calculateValueSpecRatio(m.value, specMin, specMax, specData.ftJudge, item_name);
        
        compareRecords.push({
          product,
          temp,
          vcc: parseFloat(vcc),
          vio: parseFloat(vio),
          metric: m.metric,
          item: item_name,
          description,
          alignment: rec.alignment,
          group,
          specMin,
          specTyp,
          specMax,
          judgeCriteria: specData.ftJudge,
          value: m.value,
          value_spec_ratio: ratio,
          judge: judge,
          typ_judge: typJudge,
          specRowIdx: specRow
        });
      }
    }
  }
  
  if (onProgress) onProgress(90);
  
  const summary = buildSummary(compareRecords);
  
  if (onProgress) onProgress(100);
  
  return {
    transferData: transferRecords,
    compareData: compareRecords,
    datasheetSpecs,
    summary
  };
}

export function buildSummary(compareRecords) {
  const sectionA = [];
  const sectionB = [];
  
  const sectionAMap = {};
  const sectionBMap = {};
  
  for (let rec of compareRecords) {
    const key = `${rec.item}_${rec.description}`;
    const judge = rec.judge;
    const typ_judge = rec.typ_judge;
    
    if (judge === "Fail" || typ_judge === "Fail") {
      if (!sectionAMap[key]) {
        sectionAMap[key] = {
          item: rec.item,
          spec_values: new Set(),
          fail_types: new Set(),
          temps: new Set(),
          vccs: new Set(),
          vios: new Set(),
          descriptions: new Set()
        };
      }
      const entry = sectionAMap[key];
      if (rec.temp) entry.temps.add(String(rec.temp));
      if (rec.vcc) entry.vccs.add(String(rec.vcc));
      if (rec.vio) entry.vios.add(String(rec.vio));
      if (rec.description) entry.descriptions.add(rec.description);
      
      if (judge === "Fail") {
        const failedSpec = determineFailedSpec(rec.value, rec.specMin, rec.specMax, rec.judgeCriteria, rec.item);
        if (failedSpec) {
          if (failedSpec === "Min" && rec.specMin !== null) entry.spec_values.add(String(rec.specMin));
          else if (failedSpec === "Max" && rec.specMax !== null) entry.spec_values.add(String(rec.specMax));
          else if (failedSpec === "Typ" && rec.specTyp !== null) entry.spec_values.add(String(rec.specTyp));
          entry.fail_types.add(`${failedSpec} spec fail`);
        } else {
          entry.fail_types.add("Spec fail");
        }
      }
      if (typ_judge === "Fail") {
        if (rec.specTyp !== null) entry.spec_values.add(String(rec.specTyp));
        entry.fail_types.add("Typ fail");
      }
    }
    
    const ratioValue = rec.value_spec_ratio;
    if (judge === "Pass" && ratioValue !== null && ratioValue < 1.05) {
      if (!sectionBMap[key]) {
        sectionBMap[key] = {
          item: rec.item,
          temps: new Set(),
          vccs: new Set(),
          vios: new Set(),
          descriptions: new Set(),
          min_ratio: null
        };
      }
      const entry = sectionBMap[key];
      if (rec.temp) entry.temps.add(String(rec.temp));
      if (rec.vcc) entry.vccs.add(String(rec.vcc));
      if (rec.vio) entry.vios.add(String(rec.vio));
      if (rec.description) entry.descriptions.add(rec.description);
      if (entry.min_ratio === null || ratioValue < entry.min_ratio) {
        entry.min_ratio = ratioValue;
      }
    }
  }
  
  // Format section A
  let indexA = 1;
  for (let key of Object.keys(sectionAMap)) {
    const entry = sectionAMap[key];
    sectionA.push({
      no: indexA++,
      item: entry.item,
      specValues: Array.from(entry.spec_values).sort().join(", "),
      conditions: formatConditions(entry),
      failType: Array.from(entry.fail_types).sort().join(", ")
    });
  }
  
  // Format section B
  let indexB = 1;
  for (let key of Object.keys(sectionBMap)) {
    const entry = sectionBMap[key];
    sectionB.push({
      no: indexB++,
      item: entry.item,
      conditions: formatConditions(entry),
      minRatio: entry.min_ratio !== null ? entry.min_ratio.toFixed(4) : ""
    });
  }
  
  return { sectionA, sectionB };
}

function formatConditions(payload) {
  const parts = [];
  if (payload.temps && payload.temps.size) {
    parts.push(`TEMP=${Array.from(payload.temps).sort().join(", ")}`);
  }
  if (payload.vccs && payload.vccs.size) {
    parts.push(`VCC=${Array.from(payload.vccs).map(v => `${parseFloat(v).toFixed(3)}V`).sort().join("/")}`);
  }
  if (payload.vios && payload.vios.size) {
    parts.push(`VIO=${Array.from(payload.vios).map(v => `${parseFloat(v).toFixed(3)}V`).sort().join("/")}`);
  }
  return parts.join(", ");
}

// export results to ExcelJS Workbook buffer for file download
export async function exportWorkbook(transferData, compareData, datasheetSpecs, summary) {
  const workbook = new ExcelJS.Workbook();
  
  // 1. Transfer Sheet
  const wsTransfer = workbook.addWorksheet('Transfer');
  wsTransfer.columns = [
    { header: 'Product', key: 'product', width: 15 },
    { header: 'Temp', key: 'temp', width: 10 },
    { header: 'Vcc', key: 'vcc', width: 10 },
    { header: 'VIO', key: 'vio', width: 10 },
    { header: 'Description', key: 'description', width: 40 },
    { header: '4 byte alignment', key: 'alignment', width: 20 },
    { header: 'Item', key: 'item', width: 20 },
    { header: 'Value', key: 'value', width: 15 }
  ];
  transferData.forEach(row => wsTransfer.addRow(row));
  
  // 2. DATASHEET_SPEC Sheet
  const wsSpec = workbook.addWorksheet('DATASHEET_SPEC');
  wsSpec.columns = [
    { header: 'Item', key: 'item', width: 20 },
    { header: 'Description', key: 'description', width: 40 },
    { header: '4Byte_Alignment', key: 'alignment', width: 20 },
    { header: 'Min', key: 'min', width: 15 },
    { header: 'Typ', key: 'typ', width: 15 },
    { header: 'Max', key: 'max', width: 15 }
  ];
  datasheetSpecs.forEach(row => wsSpec.addRow(row));
  
  // 3. Compare Sheet
  const wsCompare = workbook.addWorksheet('Compare');
  wsCompare.columns = [
    { header: 'Product', key: 'product', width: 15 },
    { header: 'Temp', key: 'temp', width: 10 },
    { header: 'Vcc', key: 'vcc', width: 10 },
    { header: 'VIO', key: 'vio', width: 10 },
    { header: 'Metric', key: 'metric', width: 12 },
    { header: 'Item', key: 'item', width: 20 },
    { header: 'Description', key: 'description', width: 40 },
    { header: '4Byte_Alignment', key: 'alignment', width: 20 },
    { header: 'Group', key: 'group', width: 15 },
    { header: 'Value_Spec_Ratio', key: 'ratio', width: 20 },
    { header: 'Value', key: 'value', width: 15 },
    { header: 'Min', key: 'min', width: 15 },
    { header: 'Typ', key: 'typ', width: 15 },
    { header: 'Max', key: 'max', width: 15 },
    { header: 'Judge_Criteria', key: 'criteria', width: 15 },
    { header: 'Judge', key: 'judge', width: 12 },
    { header: 'Typ_Judge', key: 'typ_judge', width: 12 }
  ];
  
  compareData.forEach((row, idx) => {
    const rowIdx = idx + 2; // header is row 1
    const specRow = row.specRowIdx;
    
    // Set dynamic formulas linking to DATASHEET_SPEC sheet
    const minFormula = `=DATASHEET_SPEC!D${specRow}`;
    const typFormula = `=DATASHEET_SPEC!E${specRow}`;
    const maxFormula = `=DATASHEET_SPEC!F${specRow}`;
    
    // Nested formulas matching exact Python logic
    const ratioFormula = `=IF(OR(K${rowIdx}="",O${rowIdx}=""),"",ABS(IF(OR(UPPER(F${rowIdx})="VIL",UPPER(F${rowIdx})="VIH"),IF(N${rowIdx}="","",IF(O${rowIdx}=">",IFERROR(N${rowIdx}/K${rowIdx},""),IF(O${rowIdx}="<",IFERROR(K${rowIdx}/N${rowIdx},""),""))),IF(IF(N${rowIdx}<>"",N${rowIdx},L${rowIdx})="","","${row.group}",IF(O${rowIdx}=">",IFERROR(IF(N${rowIdx}<>"",N${rowIdx},L${rowIdx})/K${rowIdx},""),IF(O${rowIdx}="<",IFERROR(K${rowIdx}/IF(N${rowIdx}<>"",N${rowIdx},L${rowIdx}),""),""))))))`;
    
    const judgeFormula = `=IF(OR(K${rowIdx}="",O${rowIdx}=""),"",IF(AND(UPPER(F${rowIdx})="VIL",N${rowIdx}<>""),IF(N${rowIdx}<K${rowIdx},"Pass","Fail"),IF(AND(UPPER(F${rowIdx})="VIH",N${rowIdx}<>""),IF(O${rowIdx}=">",IF(N${rowIdx}>K${rowIdx},"Pass","Fail"),IF(O${rowIdx}="<",IF(K${rowIdx}<N${rowIdx},"Pass","Fail"),"")),IF(AND(L${rowIdx}<>"",N${rowIdx}<>"",L${rowIdx}<>0,N${rowIdx}<>0),IF(AND(K${rowIdx}>L${rowIdx},K${rowIdx}<N${rowIdx}),"Pass","Fail"),IF(OR(AND(N${rowIdx}<>"",N${rowIdx}<>0),AND(L${rowIdx}<>"",L${rowIdx}<>0)),IF(O${rowIdx}="<",IF(IF(AND(N${rowIdx}<>"",N${rowIdx}<>0),N${rowIdx},L${rowIdx})<K${rowIdx},"Pass","Fail"),IF(O${rowIdx}=">",IF(IF(AND(N${rowIdx}<>"",N${rowIdx}<>0),N${rowIdx},L${rowIdx})>K${rowIdx},"Pass","Fail"),"")),"")))))`;
    
    const typJudgeFormula = `=IF(AND(M${rowIdx}<>"",M${rowIdx}<>0,K${rowIdx}<>"",E${rowIdx}="Average",IFERROR(VALUE(SUBSTITUTE(B${rowIdx},"C","")),B${rowIdx})=25,OR(IFERROR(VALUE(SUBSTITUTE(C${rowIdx},"V","")),C${rowIdx})=1.2,IFERROR(VALUE(SUBSTITUTE(C${rowIdx},"V","")),C${rowIdx})=1.8,IFERROR(VALUE(SUBSTITUTE(C${rowIdx},"V","")),C${rowIdx})=3)),IF(K${rowIdx}>M${rowIdx}*1.2,"Fail","Pass"),"")`;
    
    wsCompare.addRow({
      product: row.product,
      temp: row.temp,
      vcc: row.vcc,
      vio: row.vio,
      metric: row.metric,
      item: row.item,
      description: row.description,
      alignment: row.alignment,
      group: row.group,
      ratio: { formula: ratioFormula, result: row.value_spec_ratio },
      value: row.value,
      min: { formula: minFormula, result: row.specMin },
      typ: { formula: typFormula, result: row.specTyp },
      max: { formula: maxFormula, result: row.specMax },
      criteria: row.judgeCriteria,
      judge: { formula: judgeFormula, result: row.judge },
      typ_judge: { formula: typJudgeFormula, result: row.typ_judge }
    });
  });
  
  // 4. Summary Sheet (with styled tables)
  const wsSummary = workbook.addWorksheet('Summary');
  wsSummary.views = [{ showGridLines: true }];
  
  // Banner
  wsSummary.mergeCells('A1:E1');
  const bannerCell = wsSummary.getCell('A1');
  bannerCell.value = 'CZ Dataset Compare Summary';
  bannerCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
  bannerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } };
  bannerCell.alignment = { horizontal: 'center', vertical: 'middle' };
  wsSummary.getRow(1).height = 28;
  
  wsSummary.merge_cells = 'A2:E2'; // merge description
  wsSummary.getCell('A2').value = 'A. Out of datasheet spec（Judge=Fail 或 Typ_Judge=Fail） | B. Pass but Spec is Marginal（Judge=Pass 且 Value_Spec_Ratio < 1.05）';
  wsSummary.getCell('A2').font = { name: 'Calibri', size: 10, italic: true, color: { argb: '1F4E78' } };
  wsSummary.getRow(2).height = 36;
  
  let currentExcelRow = 4;
  
  // Section A Header
  wsSummary.mergeCells(`A${currentExcelRow}:E${currentExcelRow}`);
  const secAHeader = wsSummary.getCell(`A${currentExcelRow}`);
  secAHeader.value = 'A. Out of datasheet spec';
  secAHeader.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFF' } };
  secAHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C00000' } };
  wsSummary.getRow(currentExcelRow).height = 24;
  currentExcelRow++;
  
  // Table Headers Section A
  const headersA = ['No.', 'Test Item', 'Datasheet Spec', 'Conditions', 'Fail Type'];
  headersA.forEach((h, idx) => {
    const cell = wsSummary.getCell(currentExcelRow, idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '1F4E78' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9E1F2' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  wsSummary.getRow(currentExcelRow).height = 20;
  const aHeaderRow = currentExcelRow;
  currentExcelRow++;
  
  if (summary.sectionA.length) {
    summary.sectionA.forEach(row => {
      wsSummary.addRow([row.no, row.item, row.specValues, row.conditions, row.failType]);
      wsSummary.getRow(currentExcelRow).height = 20;
      currentExcelRow++;
    });
  } else {
    wsSummary.mergeCells(`A${currentExcelRow}:E${currentExcelRow}`);
    wsSummary.getCell(`A${currentExcelRow}`).value = '無符合條件資料';
    wsSummary.getCell(`A${currentExcelRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
    currentExcelRow++;
  }
  
  // Section B Header
  currentExcelRow++;
  wsSummary.mergeCells(`A${currentExcelRow}:E${currentExcelRow}`);
  const secBHeader = wsSummary.getCell(`A${currentExcelRow}`);
  secBHeader.value = 'B. Pass but Spec is Marginal';
  secBHeader.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFF' } };
  secBHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '9C6500' } };
  wsSummary.getRow(currentExcelRow).height = 24;
  currentExcelRow++;
  
  // Table Headers Section B
  const headersB = ['No.', 'Test Item', 'Conditions', 'GuardBand(Value_Spec_Ratio 百分比)', ''];
  headersB.forEach((h, idx) => {
    const cell = wsSummary.getCell(currentExcelRow, idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '1F4E78' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9E1F2' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  wsSummary.getRow(currentExcelRow).height = 20;
  const bHeaderRow = currentExcelRow;
  currentExcelRow++;
  
  if (summary.sectionB.length) {
    summary.sectionB.forEach(row => {
      wsSummary.addRow([row.no, row.item, row.conditions, parseFloat(row.minRatio), '']);
      wsSummary.getRow(currentExcelRow).height = 20;
      currentExcelRow++;
    });
  } else {
    wsSummary.mergeCells(`A${currentExcelRow}:E${currentExcelRow}`);
    wsSummary.getCell(`A${currentExcelRow}`).value = '無符合條件資料';
    wsSummary.getCell(`A${currentExcelRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
    currentExcelRow++;
  }
  
  // Apply Table Styling
  const thinBorder = {
    left: { style: 'thin', color: { argb: 'BFBFBF' } },
    right: { style: 'thin', color: { argb: 'BFBFBF' } },
    top: { style: 'thin', color: { argb: 'BFBFBF' } },
    bottom: { style: 'thin', color: { argb: 'BFBFBF' } }
  };
  
  wsSummary.eachRow((row, rowIdx) => {
    if (rowIdx >= 5) {
      row.eachCell((cell, colIdx) => {
        cell.border = thinBorder;
        if (colIdx === 1) {
          cell.alignment = { horizontal: 'center', vertical: 'top' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'top' };
        }
      });
    }
  });
  
  wsSummary.columnDimensions = {
    A: { width: 7 },
    B: { width: 22 },
    C: { width: 18 },
    D: { width: 58 },
    E: { width: 26 }
  };
  
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}
