import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { C } from './theme';

/** צבעים קבועים לסדרות (לפי סדר, לא מחזורי). כל סוג זית מקבל צבע לפי המיקום שלו ברשימה */
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
export const seriesColor = (i: number) => SERIES[i] ?? C.muted;

/** גרף עמודות אופקי – שם מימין, עמודה, וערך בסוף העמודה */
export function BarChart({
  rows, format,
}: { rows: { key: string; label: string; value: number | null }[]; format: (v: number) => string }) {
  const [sel, setSel] = useState<string | null>(null);
  const valid = rows.filter((r): r is { key: string; label: string; value: number } => r.value != null);
  if (valid.length === 0) return <Text style={{ color: C.muted, fontSize: 15 }}>אין נתונים לגרף</Text>;
  const max = Math.max(...valid.map((r) => r.value), 0) || 1;
  return (
    <View style={{ gap: 10 }}>
      {valid.map((r) => (
        <Pressable key={r.key} onPress={() => setSel(sel === r.key ? null : r.key)} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 15, color: C.text, fontWeight: sel === r.key ? '700' : '500', flexShrink: 1 }} numberOfLines={1}>
              {r.label}
            </Text>
            <Text style={{ fontSize: 15, color: C.text, fontWeight: '700' }}>{format(r.value)}</Text>
          </View>
          <View style={{ height: 14, backgroundColor: '#EEECE3', borderRadius: 4, overflow: 'hidden' }}>
            <View
              style={{
                height: 14,
                width: `${Math.max(1, (r.value / max) * 100)}%`,
                backgroundColor: sel === r.key ? C.primaryDark : C.primary,
                borderRadius: 4,
              }}
            />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

export type LineSeries = { key: string; name: string; color: string; points: { x: string; y: number; label: string }[] };

/** גרף קווי לאורך זמן. ציר X = התאריכים (לפי הסדר), ציר Y = ערך. לחיצה על נקודה מציגה את הערך */
export function LineChart({
  series, xLabel, format,
}: { series: LineSeries[]; xLabel: (x: string) => string; format: (v: number) => string }) {
  const [width, setWidth] = useState(0);
  const [sel, setSel] = useState<{ s: number; p: number } | null>(null);
  const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort();
  const ys = series.flatMap((s) => s.points.map((p) => p.y));
  if (xs.length === 0) return <Text style={{ color: C.muted, fontSize: 15 }}>אין נתונים לגרף</Text>;

  const H = 220, padL = 38, padR = 14, padT = 14, padB = 28;
  // ציר Y עם מספרים עגולים (צעדים של 1/2/5)
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const raw = Math.max(0.5, (maxY - minY) / 3);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((k) => k * mag).find((v) => v >= raw)!;
  const lo = Math.max(0, Math.floor((minY - step * 0.3) / step) * step);
  const hi = Math.ceil((maxY + step * 0.3) / step) * step;
  const plotW = Math.max(1, width - padL - padR), plotH = H - padT - padB;
  const xPos = (x: string) => padL + (xs.length === 1 ? plotW / 2 : (xs.indexOf(x) / (xs.length - 1)) * plotW);
  const yPos = (y: number) => padT + (1 - (y - lo) / (hi - lo)) * plotH;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 1000; t += step) ticks.push(Math.round(t * 1000) / 1000);
  const xTickIdx = xs.length <= 5 ? xs.map((_, i) => i) : [0, Math.floor((xs.length - 1) / 2), xs.length - 1];
  const selPoint = sel ? series[sel.s]?.points[sel.p] : null;

  return (
    <View>
      {/* מקרא */}
      {series.length > 1 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
          {series.map((s) => (
            <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: s.color }} />
              <Text style={{ fontSize: 15, color: C.text }}>{s.name}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ minHeight: 26, justifyContent: 'center' }}>
        <Text style={{ fontSize: 15, color: selPoint ? C.text : C.muted, fontWeight: selPoint ? '700' : '400' }}>
          {selPoint && sel ? `${series[sel.s].name} · ${selPoint.label}: ${format(selPoint.y)}` : 'לחץ על נקודה כדי לראות את הערך'}
        </Text>
      </View>
      {/* הגרף עצמו תמיד משמאל לימין, כמו באקסל */}
      <View style={{ direction: 'ltr', height: H }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={H}>
            {ticks.map((t) => (
              <Line key={t} x1={padL} x2={width - padR} y1={yPos(t)} y2={yPos(t)} stroke="#E4E2D8" strokeWidth={1} />
            ))}
            {ticks.map((t) => (
              <SvgText key={`l${t}`} x={padL - 6} y={yPos(t) + 4} fontSize={11} fill={C.muted} textAnchor="end">
                {format(t)}
              </SvgText>
            ))}
            {xTickIdx.map((i) => (
              <SvgText key={`x${i}`} x={xPos(xs[i])} y={H - 8} fontSize={11} fill={C.muted}
                textAnchor={xs.length === 1 ? 'middle' : i === 0 ? 'start' : i === xs.length - 1 ? 'end' : 'middle'}>
                {xLabel(xs[i])}
              </SvgText>
            ))}
            {series.map((s) =>
              s.points.length > 1 ? (
                <Polyline key={s.key} points={s.points.map((p) => `${xPos(p.x)},${yPos(p.y)}`).join(' ')}
                  fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              ) : null,
            )}
            {series.map((s, si) =>
              s.points.map((p, pi) => {
                const on = sel?.s === si && sel?.p === pi;
                return (
                  <Circle key={`${s.key}${pi}`} cx={xPos(p.x)} cy={yPos(p.y)} r={on ? 7 : 5}
                    fill={s.color} stroke="#fff" strokeWidth={2} />
                );
              }),
            )}
            {/* אזורי לחיצה גדולים מהנקודות */}
            {series.map((s, si) =>
              s.points.map((p, pi) => (
                <Circle key={`h${s.key}${pi}`} cx={xPos(p.x)} cy={yPos(p.y)} r={16} fill="transparent"
                  onPress={() => setSel(sel?.s === si && sel?.p === pi ? null : { s: si, p: pi })} />
              )),
            )}
          </Svg>
        ) : null}
      </View>
    </View>
  );
}
