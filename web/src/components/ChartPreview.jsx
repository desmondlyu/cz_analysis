import React, { useEffect, useRef } from 'react';
import vegaEmbed from 'vega-embed';

// A single chart panel representing one [group, alignment, temp] combo
function SingleChart({ records, sortedItems, yDomain, showYAxis, chartId }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !records || records.length === 0) return;

    // Define spec for this individual sub-panel
    const spec = {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      background: 'transparent',
      padding: { left: 10, right: 10, top: 10, bottom: 180 }, // Large bottom padding for labels
      width: 'container', // auto-fit container width
      height: 300, // height of drawing area
      data: { values: records },
      layer: [
        // 1. Measured Value Points (Blue '*')
        {
          transform: [{ filter: "datum.series === 'Measured Value'" }],
          mark: {
            type: 'text',
            text: '*',
            fontSize: 22,
            fontWeight: 'bold',
            color: '#00e5ff', // Cyber Blue asterisk
            dy: 6
          },
          encoding: {
            x: {
              field: 'item',
              type: 'nominal',
              sort: sortedItems,
              axis: {
                title: 'Item ordered by Max',
                titleColor: '#64748b',
                titleFontSize: 10,
                labelColor: '#f1f5f9',
                labelAngle: -90,
                labelFontSize: 11,
                labelLimit: 240,
                grid: true,
                gridColor: '#1e293b'
              }
            },
            y: {
              field: 'yVal',
              type: 'quantitative',
              scale: { domain: yDomain, zero: false },
              axis: showYAxis ? {
                title: 'Value (Max or Min and Value)',
                titleColor: '#94a3b8',
                labelColor: '#94a3b8',
                grid: true,
                gridColor: '#1e293b'
              } : {
                title: null,
                labels: false,
                ticks: false,
                grid: true,
                gridColor: '#1e293b'
              }
            },
            tooltip: [
              { field: 'item', type: 'nominal', title: 'Item' },
              { field: 'description', type: 'nominal', title: 'Description' },
              { field: 'tempLabel', type: 'nominal', title: 'Temp' },
              { field: 'yVal', type: 'quantitative', title: 'Value', format: '.4f' },
              { field: 'judge', type: 'nominal', title: 'Judge' }
            ]
          }
        },
        // 2. Spec Limit (Red Horizontal line segments)
        {
          transform: [{ filter: "datum.series === 'Spec Limit'" }],
          mark: {
            type: 'tick',
            color: '#ef4444', // Red spec line
            thickness: 2.5,
            size: 20
          },
          encoding: {
            x: { field: 'item', type: 'nominal', sort: sortedItems },
            y: { field: 'yVal', type: 'quantitative' },
            tooltip: [
              { field: 'item', type: 'nominal', title: 'Item' },
              { field: 'specSource', type: 'nominal', title: 'Spec Type' },
              { field: 'yVal', type: 'quantitative', title: 'Spec Limit', format: '.4f' }
            ]
          }
        }
      ],
      config: {
        view: { stroke: 'transparent' }
      }
    };

    vegaEmbed(containerRef.current, spec, {
      actions: false,
      theme: 'dark'
    }).catch(err => {
      console.error('Sub-chart rendering error:', err);
    });

  }, [records, sortedItems, yDomain, showYAxis]);

  return <div ref={containerRef} className="sub-chart-box"></div>;
}

export default function ChartPreview({ compareRecords, metricKey = 'average' }) {
  
  if (!compareRecords || compareRecords.length === 0) {
    return (
      <div className="chart-empty-state">
        <p>無可用資料，請調整篩選器條件</p>
      </div>
    );
  }

  // 1. Determine target metric and prepare data
  const targetMetricRecords = compareRecords.filter(r => {
    const m = String(r.metric).trim().toLowerCase();
    if (metricKey === 'average' || metricKey === 'typ') {
      return m === 'average';
    }
    return m === metricKey;
  });

  if (targetMetricRecords.length === 0) {
    return (
      <div className="chart-empty-state">
        <p>無符合 Metric = {metricKey.toUpperCase()} 的數據</p>
      </div>
    );
  }

  // Translate records
  const plotValues = [];
  const itemMaxMap = {};

  targetMetricRecords.forEach(rec => {
    const tempLabel = `${parseFloat(rec.temp)}°C`;
    const itemStr = rec.item;
    const vVal = rec.value !== null && rec.value !== undefined ? parseFloat(rec.value) : null;
    
    let specVal = null;
    let specSource = 'N/A';
    if (rec.specMax !== null && rec.specMax !== undefined && rec.specMax !== '') {
      specVal = parseFloat(rec.specMax);
      specSource = 'Max Spec';
    } else if (rec.specMin !== null && rec.specMin !== undefined && rec.specMin !== '') {
      specVal = parseFloat(rec.specMin);
      specSource = 'Min Spec';
    }

    const basePayload = {
      item: itemStr,
      description: rec.description || '',
      tempLabel,
      tempVal: parseFloat(rec.temp),
      alignment: rec.alignment || 'N/A',
      group: rec.group || 'N/A',
      vcc: rec.vcc,
      vio: rec.vio,
      judge: rec.judge || 'N/A',
      ratio: rec.value_spec_ratio ? parseFloat(rec.value_spec_ratio).toFixed(4) : 'N/A'
    };

    if (vVal !== null) {
      if (itemMaxMap[itemStr] === undefined || vVal > itemMaxMap[itemStr]) {
        itemMaxMap[itemStr] = vVal;
      }
      plotValues.push({
        ...basePayload,
        series: 'Measured Value',
        yVal: vVal
      });
    }

    if (specVal !== null) {
      plotValues.push({
        ...basePayload,
        series: 'Spec Limit',
        yVal: specVal,
        specSource
      });
    }
  });

  if (plotValues.length === 0) {
    return (
      <div className="chart-empty-state">
        <p>無有效實測或規格數據</p>
      </div>
    );
  }

  // Sort items by Max (descending)
  const sortedItems = Object.keys(itemMaxMap).sort((a, b) => itemMaxMap[b] - itemMaxMap[a]);

  // 2. Group data by Group -> 4Byte_Alignment -> Temp
  const groupedData = {};
  plotValues.forEach(val => {
    const g = val.group;
    const align = val.alignment;
    const temp = val.tempLabel;

    if (!groupedData[g]) groupedData[g] = {};
    if (!groupedData[g][align]) groupedData[g][align] = {};
    if (!groupedData[g][align][temp]) groupedData[g][align][temp] = [];

    groupedData[g][align][temp].push(val);
  });

  // Render list of groups
  return (
    <div className="multi-group-charts-container">
      {Object.keys(groupedData).sort().map(groupName => {
        const groupPayload = groupedData[groupName];
        
        // Calculate a unified Y axis domain for this entire Group
        const allGroupVals = [];
        Object.keys(groupPayload).forEach(align => {
          Object.keys(groupPayload[align]).forEach(temp => {
            groupPayload[align][temp].forEach(v => allGroupVals.push(v.yVal));
          });
        });
        
        const gMin = Math.min(...allGroupVals);
        const gMax = Math.max(...allGroupVals);
        const padding = (gMax - gMin) * 0.1 || 1.0;
        const unifiedYDomain = [gMin - padding, gMax + padding];

        // Track how many charts we render to decide showYAxis (only show Y on the very first sub-chart)
        let chartCounter = 0;

        return (
          <div key={groupName} className="group-chart-section">
            <div className="group-section-title">
              <span className="accent-bar"></span>
              <h4>Group Classification: {groupName}</h4>
            </div>

            {/* Horizontal Alignment Layout Container */}
            <div className="alignment-layout-container">
              {Object.keys(groupPayload).sort().map(alignVal => {
                const alignPayload = groupPayload[alignVal];

                return (
                  <div key={alignVal} className="alignment-box-panel">
                    <div className="alignment-panel-header">
                      4Byte_Alignment: {alignVal}
                    </div>

                    {/* Horizontal Temp Sub-charts */}
                    <div className="temp-charts-row">
                      {Object.keys(alignPayload).sort((a,b) => parseFloat(a)-parseFloat(b)).map(tempVal => {
                        const subRecords = alignPayload[tempVal];
                        const showYAxis = chartCounter === 0;
                        chartCounter++;

                        return (
                          <div key={tempVal} className="temp-chart-column">
                            <div className="temp-column-header">
                              Temp: {tempVal}
                            </div>
                            <SingleChart 
                              records={subRecords}
                              sortedItems={sortedItems}
                              yDomain={unifiedYDomain}
                              showYAxis={showYAxis}
                              chartId={`${groupName}_${alignVal}_${tempVal}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
