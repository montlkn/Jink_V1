// src/components/charts/DonutChart.js
import * as d3 from "d3-shape";
import { useMemo } from "react";
import Svg, { Circle, G, Path, Rect, Text as SvgText, TSpan } from "react-native-svg";
import { getArchetypeColorSafe } from "@/constants/archetypeColors";

/**
 * DonutChart with elbow leaders and rounded bends.
 * Props:
 *  - data: Array<{ name: string, value: number }>
 *  - width: number
 *  - height: number
 *  - innerRadius?: number
 *  - showLeaderLabels?: boolean
 *  - maxLeaderLabels?: number
 */
export default function DonutChart({
  data = [],
  width = 520,
  height = 520,
  innerRadius: innerRadiusProp,
  showLeaderLabels = true,
  maxLeaderLabels,
}) {
  // sanitize
  const safeData = useMemo(
    () => (Array.isArray(data) ? data.filter(d => d && d.value > 0) : []),
    [data]
  );
  const total = useMemo(
    () => safeData.reduce((sum, entry) => sum + entry.value, 0),
    [safeData]
  );

  // margins with label columns
  const baseMargin = { top: 24, right: 24, bottom: 24, left: 24 };
  const avgCharPx = 7;
  const longestName = safeData.length ? Math.max(...safeData.map(d => (d.name || "").length)) : 0;
  let labelCol = Math.max(110, Math.min(240, longestName * avgCharPx));

  let margin = {
    top: baseMargin.top,
    right: baseMargin.right + labelCol,
    bottom: baseMargin.bottom,
    left: baseMargin.left + labelCol,
  };

  const calcRadius = m =>
    Math.max(0, Math.min(width - m.left - m.right, height - m.top - m.bottom) / 2);

  let radius = calcRadius(margin);
  const minUsableRadius = 70;

  if (radius < minUsableRadius) {
    const need = (minUsableRadius - radius) * 2;
    labelCol = Math.max(90, labelCol - need);
    margin = {
      top: baseMargin.top,
      right: baseMargin.right + labelCol,
      bottom: baseMargin.bottom,
      left: baseMargin.left + labelCol,
    };
    radius = calcRadius(margin);
  }

  const maxCol = Math.max(90, Math.floor(width * 0.4 - baseMargin.right));
  if (labelCol > maxCol) {
    labelCol = maxCol;
    margin = {
      top: baseMargin.top,
      right: baseMargin.right + labelCol,
      bottom: baseMargin.bottom,
      left: baseMargin.left + labelCol,
    };
    radius = calcRadius(margin);
  }

  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const innerRadius =
    innerRadiusProp != null
      ? innerRadiusProp
      : Math.round(Math.max(minUsableRadius * 0.6, radius * 0.6));

  // pie + arcs
  const pieGen = useMemo(
    () => d3.pie().sort(null).padAngle(0.003).value(d => d.value),
    []
  );
  const pieData = useMemo(() => pieGen(safeData), [pieGen, safeData]);

  const arcGen = useMemo(() => d3.arc().innerRadius(innerRadius).outerRadius(radius), [innerRadius, radius]);
  const outerArc = useMemo(() => d3.arc().innerRadius(radius * 0.92).outerRadius(radius * 0.92), [radius]);

  // utils
  const formatPct = v => `${(total > 0 ? (v / total) * 100 : 0).toFixed(1)}%`;

  // wrap ≤ 2 lines
  const wrapLabel = (text, maxChars) => {
    const t = String(text || "");
    if (t.length <= maxChars) return [t];
    const words = t.split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";
    for (const w of words) {
      const cand = line ? `${line} ${w}` : w;
      if (cand.length <= maxChars) line = cand;
      else {
        if (line) lines.push(line);
        line = w;
      }
    }
    if (line) lines.push(line);
    if (lines.length > 2) {
      lines[1] = lines[1].slice(0, Math.max(0, maxChars - 1)) + "…";
      return [lines[0], lines[1]];
    }
    return lines;
  };

  // vertical packing on both sides
  const labelLayout = useMemo(() => {
    if (!radius) return [];
    const baseLine = 13;
    const lineGap = 4;
    const minSpacing = 6;
    const clampY = Math.max(40, radius * 0.9);
    const maxCharsPerLine = Math.max(12, Math.floor((labelCol - 24) / avgCharPx));
    const estimateLines = s =>
      Math.min(2, Math.ceil((String(s || "").length || 1) / maxCharsPerLine));

    const left = [];
    const right = [];

    pieData.forEach((seg, index) => {
      const midAngle = (seg.startAngle + seg.endAngle) / 2;
      const isRight = midAngle < Math.PI;
      const outerPoint = outerArc.centroid(seg);
      const lines = estimateLines(seg.data.name) + 1; // + percentage
      const blockH = lines * baseLine + (lines - 1) * lineGap + 8;
      const entry = { index, isRight, idealY: outerPoint[1], finalY: outerPoint[1], blockH };
      (isRight ? right : left).push(entry);
    });

    left.sort((a, b) => a.idealY - b.idealY);
    right.sort((a, b) => a.idealY - b.idealY);

    const adjust = labels => {
      if (!labels.length) return;
      for (let i = 1; i < labels.length; i++) {
        const prev = labels[i - 1];
        const curr = labels[i];
        const minY = prev.finalY + prev.blockH + minSpacing;
        if (curr.finalY < minY) curr.finalY = minY;
      }
      for (let i = labels.length - 1; i >= 0; i--) {
        const half = labels[i].blockH / 2;
        if (labels[i].finalY + half > clampY) labels[i].finalY = clampY - half;
        if (labels[i].finalY - half < -clampY) labels[i].finalY = -clampY + half;
      }
      for (let i = labels.length - 2; i >= 0; i--) {
        const next = labels[i + 1];
        const curr = labels[i];
        const maxCurrentY = next.finalY - next.blockH - 6;
        if (curr.finalY > maxCurrentY) curr.finalY = maxCurrentY;
      }
    };

    adjust(left);
    adjust(right);
    return [...left, ...right];
  }, [pieData, radius, outerArc, labelCol]);

  const byValueDesc = [...safeData].sort((a, b) => b.value - a.value);
  const allowedNames = showLeaderLabels
    ? maxLeaderLabels
      ? new Set(byValueDesc.slice(0, maxLeaderLabels).map(d => d.name))
      : new Set(safeData.map(d => d.name))
    : new Set(byValueDesc.slice(0, 3).map(d => d.name));

  const minAngle = 0.06; // ~3.4°
  const labelPosByIndex = new Map(labelLayout.map(l => [l.index, l.finalY]));

  const cx = margin.left + innerW / 2;
  const cy = margin.top + innerH / 2;

  // --- Elbow routing helpers (inspired by d3-annotation connector options) ---
  const elbow = (A, B, C, r = 6) => {
    // Build a rounded elbow path from A -> B -> C.
    // We create two segments with a small quadratic curve at the bend.
    // r = corner radius in px.
    const [x1, y1] = A;
    const [x2, y2] = B;
    const [x3, y3] = C;

    // Direction vectors
    const vx1 = x2 - x1, vy1 = y2 - y1;
    const vx2 = x3 - x2, vy2 = y3 - y2;

    const len1 = Math.max(1e-6, Math.hypot(vx1, vy1));
    const len2 = Math.max(1e-6, Math.hypot(vx2, vy2));

    const nx1 = vx1 / len1, ny1 = vy1 / len1;
    const nx2 = vx2 / len2, ny2 = vy2 / len2;

    // Trim the straight segments by r to make space for the curve
    const bx1 = x2 - nx1 * r;
    const by1 = y2 - ny1 * r;
    const bx2 = x2 + nx2 * r;
    const by2 = y2 + ny2 * r;

    // Use the bend point as quadratic control to approximate a rounded corner
    return `M ${x1} ${y1} L ${bx1} ${by1} Q ${x2} ${y2} ${bx2} ${by2} L ${x3} ${y3}`;
  };

  // simple note box metrics
  const notePadX = 6;
  const notePadY = 4;
  const labelFont = 13;
  const pctFont = 11;

  return (
    <Svg width={width} height={height}>
      <G transform={`translate(${cx},${cy})`}>
        {/* slices */}
        {pieData.map((d, i) => (
          <Path
            key={`arc-${i}`}
            d={arcGen(d)}
            fill={getArchetypeColorSafe(d.data.name)}
          />
        ))}

        {/* elbow leaders + labels */}
        {pieData.map((d, i) => {
          const name = d.data.name;
          const isAllowed = allowedNames.has(name);
          const angle = d.endAngle - d.startAngle;
          const showLeader = showLeaderLabels && isAllowed && angle >= minAngle;
          if (!showLeader) return null;

          const midAngle = (d.startAngle + d.endAngle) / 2;
          const isRight = midAngle < Math.PI;

          // Geometry points
          const A = arcGen.centroid(d);        // arc edge
          const B = outerArc.centroid(d);      // just outside the arc
          const finalY = labelPosByIndex.get(i) ?? B[1];
          const colX = radius * 0.90 * (isRight ? 1 : -1); // column x
          const C = [colX, finalY];

          // Build rounded elbow path
          const dPath = elbow(A, B, C, 6);

          // Label position and anchor
          const textX = colX + (isRight ? 8 : -8);
          const textAnchor = isRight ? "start" : "end";

          // Compute text lines and a loose box width estimate
          const maxCharsPerLine = Math.max(12, Math.floor((labelCol - 24) / avgCharPx));
          const lines = wrapLabel(name, maxCharsPerLine);

          // Optional minimalist note box behind text (subtle)
          const approxLineW = Math.min(labelCol - 12, Math.max(...lines.map(s => s.length)) * avgCharPx);
          const noteW = approxLineW + notePadX * 2;
          const noteH = (lines.length >= 2 ? 2 : 1) * labelFont + 20 + notePadY * 2; // + percentage line

          const noteX = isRight ? textX - notePadX : textX - noteW + notePadX;
          const noteY = finalY - (labelFont + 4);

          return (
            <G key={`leader-${i}`}>
              {/* connector with rounded bend */}
              <Path
                d={dPath}
                fill="none"
                stroke="#6b7280"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* dot at text end for visual stability */}
              <Circle cx={C[0]} cy={C[1]} r={2.2} fill="#6b7280" />

              {/* subtle note box */}
              <Rect
                x={noteX}
                y={noteY - notePadY}
                rx={6}
                ry={6}
                width={noteW}
                height={noteH}
                fill="#ffffff"
                opacity={0.85}
              />

              {/* text lines */}
              <SvgText
                x={textX}
                y={finalY}
                fontSize={labelFont}
                fontWeight="600"
                fill="#111827"
                textAnchor={textAnchor}
              >
                {lines.map((line, idx) => (
                  <TSpan key={idx} x={textX} dy={idx === 0 ? -6 : 18}>
                    {line}
                  </TSpan>
                ))}
              </SvgText>

              {/* percentage */}
              <SvgText
                x={textX}
                y={finalY + (lines.length >= 2 ? 22 : 18)}
                fontSize={pctFont}
                fill="#6b7280"
                textAnchor={textAnchor}
              >
                {formatPct(d.data.value)}
              </SvgText>
            </G>
          );
        })}
      </G>
    </Svg>
  );
}
