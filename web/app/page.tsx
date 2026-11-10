"use client";

import { useState } from "react";
import Footer from "./components/Footer";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell
} from "recharts";
import {
  FlaskConical, TrendingUp, DollarSign, Target,
  CheckCircle2, XCircle, ChevronRight, Users,
  BarChart3, Zap, FileText
} from "lucide-react";
import data from "./data.json";

// ── Design tokens ──────────────────────────────────────────────────────────────
const BLUE = "#2563eb";
const PINK = "#db2777";
const GRAY = "#6b7280";
const GREEN = "#16a34a";
const RED = "#dc2626";
const AMBER = "#d97706";

const TABS = ["Overview", "Balance", "Lift", "ROI", "Targeting", "Recommendation"] as const;
type Tab = typeof TABS[number];

// ── Shared components ──────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? "bg-blue-50 border-blue-100" : "bg-white border-zinc-200"}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${accent ? "text-blue-700" : "text-zinc-900"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      {sub && <p className="mt-0.5 text-sm text-zinc-500">{sub}</p>}
    </div>
  );
}

function Badge({ sig }: { sig: boolean }) {
  return sig ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 border border-green-100">
      <CheckCircle2 size={10} /> Significant
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 border border-red-100">
      <XCircle size={10} /> Not significant
    </span>
  );
}

// ── Custom tooltip ──────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-100 bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-zinc-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-semibold">{p.value}</span></p>
      ))}
    </div>
  );
};

// ── Main app ───────────────────────────────────────────────────────────────────
export default function Home() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [emailCost, setEmailCost] = useState(0.10);
  const [margin, setMargin] = useState(0.40);

  const { groups, lifts, balance, power, uplift } = data as any;
  const mens = lifts.mens_email;
  const womens = lifts.womens_email;

  const groupBarData = [
    { name: "Men's Email", rate: groups.mens_email.conv_rate, spend: groups.mens_email.avg_spend, n: groups.mens_email.n },
    { name: "Women's Email", rate: groups.womens_email.conv_rate, spend: groups.womens_email.avg_spend, n: groups.womens_email.n },
    { name: "Control", rate: groups.no_email.conv_rate, spend: groups.no_email.avg_spend, n: groups.no_email.n },
  ];

  const roiSens = Array.from({ length: 40 }, (_, i) => {
    const cost = 0.025 + i * 0.025;
    const mensDiff = mens.rev.absolute_lift;
    const womensDiff = womens.rev.absolute_lift;
    const roiMens = ((mensDiff * margin - cost) / cost * 100);
    const roiWomens = ((womensDiff * margin - cost) / cost * 100);
    return { cost: cost.toFixed(2), mens: Math.round(roiMens), womens: Math.round(roiWomens) };
  });

  const ciData = [
    { name: "Men's Conversion", lift: mens.conv.absolute_lift * 100, lo: mens.conv.ci_lower * 100, hi: mens.conv.ci_upper * 100, color: BLUE },
    { name: "Women's Conversion", lift: womens.conv.absolute_lift * 100, lo: womens.conv.ci_lower * 100, hi: womens.conv.ci_upper * 100, color: PINK },
    { name: "Men's Revenue ($)", lift: mens.rev.absolute_lift, lo: mens.rev.ci_lower, hi: mens.rev.ci_upper, color: "#7c3aed" },
    { name: "Women's Revenue ($)", lift: womens.rev.absolute_lift, lo: womens.rev.ci_lower, hi: womens.rev.ci_upper, color: "#9333ea" },
  ];

  const qiniData = uplift.qini.map((d: any) => ({
    pct: d.pct_targeted.toFixed(0) + "%",
    model: d.qini,
  }));

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <FlaskConical size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-900">Offer Incrementality Lab</h1>
              <p className="text-xs text-zinc-400">Hillstrom MineThatData · 64,000 customers</p>
            </div>
          </div>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-500">Portfolio project · public dataset</span>
        </div>
        <div className="mx-auto max-w-7xl px-6 flex gap-1 pb-0 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">

        {tab === "Overview" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-zinc-900">Experiment at a glance</h2>
              <p className="mt-1 text-sm text-zinc-500">Randomised email experiment · 3 arms · 2-week measurement window</p>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KpiCard label="Total customers" value="64,000" accent />
              <KpiCard label="Arms" value="3" sub="men · women · control" />
              <KpiCard label="Baseline conversion" value={`${power.baseline_rate * 100}%`} />
              <KpiCard label="MDE @ 80% power" value={`${power.mde_pp} pp`} sub={`n=${power.n_arm.toLocaleString()} per arm`} />
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 bg-white p-6">
                <h3 className="mb-4 text-sm font-semibold text-zinc-700">Conversion rate by arm</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={groupBarData} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#71717a" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="rate" name="Conv. rate %" radius={[4, 4, 0, 0]}>
                      {groupBarData.map((_, i) => (
                        <Cell key={i} fill={[BLUE, PINK, "#d1d5db"][i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-6">
                <h3 className="mb-4 text-sm font-semibold text-zinc-700">Average spend per customer ($)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={groupBarData} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#71717a" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} unit="$" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="spend" name="Avg spend $" radius={[4, 4, 0, 0]}>
                      {groupBarData.map((_, i) => (
                        <Cell key={i} fill={[BLUE, PINK, "#d1d5db"][i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    {["Arm", "Customers", "Conv. rate", "Avg spend", "Total spend"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Men's Email", g: groups.mens_email, color: BLUE },
                    { label: "Women's Email", g: groups.womens_email, color: PINK },
                    { label: "Control", g: groups.no_email, color: GRAY },
                  ].map(({ label, g, color }) => (
                    <tr key={label} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="inline-block h-2 w-2 rounded-full mr-2" style={{ background: color }} />
                        <span className="font-medium text-zinc-900">{label}</span>
                      </td>
                      <td className="px-5 py-3.5 tabular-nums text-zinc-600">{g.n.toLocaleString()}</td>
                      <td className="px-5 py-3.5 tabular-nums text-zinc-600">{g.conv_rate}%</td>
                      <td className="px-5 py-3.5 tabular-nums text-zinc-600">${g.avg_spend.toFixed(3)}</td>
                      <td className="px-5 py-3.5 tabular-nums text-zinc-600">${g.total_spend.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "Balance" && (
          <div className="space-y-8">
            <SectionHeader title="Randomisation quality" sub="All pre-experiment covariates should be equally distributed across arms (p > 0.05)." />
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    {["Covariate", "Test", "Statistic", "p-value", "Verdict"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(balance as any[]).map((row: any) => (
                    <tr key={row.feature} className="border-b border-zinc-50 hover:bg-zinc-50">
                      <td className="px-5 py-3.5 font-medium text-zinc-900">{row.feature}</td>
                      <td className="px-5 py-3.5 text-zinc-500 uppercase text-xs">{row.test}</td>
                      <td className="px-5 py-3.5 tabular-nums text-zinc-600">{row.stat}</td>
                      <td className="px-5 py-3.5 tabular-nums text-zinc-600">{row.p_value}</td>
                      <td className="px-5 py-3.5">
                        {row.balanced ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                            <CheckCircle2 size={12} /> Balanced
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                            <XCircle size={12} /> Imbalanced
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-xl border border-green-100 bg-green-50 p-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-600" />
                <p className="text-sm font-medium text-green-800">All 7 covariates balanced (p &gt; 0.05) — randomisation is clean</p>
              </div>
              <p className="mt-1 text-xs text-green-600 ml-6">
                Both χ² tests (categorical) and Kruskal-Wallis tests (numeric) show no significant difference between arms before the experiment.
              </p>
            </div>
          </div>
        )}

        {tab === "Lift" && (
          <div className="space-y-8">
            <SectionHeader title="Conversion & revenue lift" sub={`95% CI for conversion lift (two-proportion z-test) and revenue lift (bootstrap, 2,000 draws). Baseline: ${power.baseline_rate * 100}%`} />
            {[
              { label: "Men's Email", conv: mens.conv, rev: mens.rev, color: BLUE },
              { label: "Women's Email", conv: womens.conv, rev: womens.rev, color: PINK },
            ].map(({ label, conv, rev, color }) => (
              <div key={label} className="rounded-xl border border-zinc-200 bg-white p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ background: color }} />
                    <h3 className="font-semibold text-zinc-900">{label}</h3>
                  </div>
                  <Badge sig={conv.significant} />
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <KpiCard label="Control conv. rate" value={`${(conv.control_rate * 100).toFixed(2)}%`} />
                  <KpiCard label="Treatment conv. rate" value={`${(conv.treatment_rate * 100).toFixed(2)}%`} accent />
                  <KpiCard label="Absolute lift" value={`${(conv.absolute_lift * 100) > 0 ? "+" : ""}${(conv.absolute_lift * 100).toFixed(2)} pp`} sub={`95% CI [${(conv.ci_lower * 100).toFixed(2)}, ${(conv.ci_upper * 100).toFixed(2)}] pp`} accent />
                  <KpiCard label="Revenue lift/customer" value={`$${rev.absolute_lift > 0 ? "+" : ""}${rev.absolute_lift.toFixed(3)}`} sub={`95% CI [$${rev.ci_lower.toFixed(3)}, $${rev.ci_upper.toFixed(3)}]`} />
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-zinc-400">
                  <span>p-value: <span className="font-mono font-medium text-zinc-600">{conv.p_value}</span></span>
                  <span>Relative lift: <span className="font-mono font-medium text-zinc-600">{conv.relative_lift_pct > 0 ? "+" : ""}{conv.relative_lift_pct}%</span></span>
                  <span>Revenue p≈: <span className="font-mono font-medium text-zinc-600">{rev.p_value_approx}</span></span>
                </div>
              </div>
            ))}
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <h3 className="mb-5 text-sm font-semibold text-zinc-700">Lift with 95% confidence intervals</h3>
              <div className="space-y-5">
                {ciData.map(row => {
                  const range = row.hi - row.lo;
                  const zeroPos = ((0 - row.lo) / range) * 100;
                  const liftPos = ((row.lift - row.lo) / range) * 100;
                  return (
                    <div key={row.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-zinc-600">{row.name}</span>
                        <span className="text-xs font-mono font-semibold text-zinc-900">{row.lift > 0 ? "+" : ""}{row.lift.toFixed(3)}</span>
                      </div>
                      <div className="relative h-2 rounded-full bg-zinc-100">
                        <div className="absolute h-2 rounded-full opacity-25" style={{ left: "0%", width: "100%", background: row.color }} />
                        <div className="absolute h-2 rounded-full" style={{ left: `${Math.min(liftPos, zeroPos)}%`, width: `${Math.abs(liftPos - zeroPos)}%`, background: row.color }} />
                        <div className="absolute top-1/2 -translate-y-1/2 h-3 w-0.5 bg-zinc-400" style={{ left: `${zeroPos}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-zinc-300 mt-0.5">
                        <span>{row.lo.toFixed(3)}</span><span>{row.hi.toFixed(3)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === "ROI" && (
          <div className="space-y-8">
            <SectionHeader title="Campaign ROI analysis" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 bg-white p-2 flex items-center gap-3">
                <label className="text-xs font-medium text-zinc-500 w-36 shrink-0 pl-3">Cost per email ($)</label>
                <input type="range" min={0.01} max={1} step={0.01} value={emailCost} onChange={e => setEmailCost(+e.target.value)} className="w-full accent-blue-600" />
                <span className="text-sm font-mono font-semibold text-zinc-800 w-12 text-right pr-3">${emailCost.toFixed(2)}</span>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-2 flex items-center gap-3">
                <label className="text-xs font-medium text-zinc-500 w-36 shrink-0 pl-3">Revenue margin</label>
                <input type="range" min={0.1} max={0.8} step={0.05} value={margin} onChange={e => setMargin(+e.target.value)} className="w-full accent-blue-600" />
                <span className="text-sm font-mono font-semibold text-zinc-800 w-12 text-right pr-3">{(margin * 100).toFixed(0)}%</span>
              </div>
            </div>
            {[
              { label: "Men's Email", rev: mens.rev, n: groups.mens_email.n, color: BLUE },
              { label: "Women's Email", rev: womens.rev, n: groups.womens_email.n, color: PINK },
            ].map(({ label, rev, n, color }) => {
              const liftPerCustomer = rev.absolute_lift;
              const incRevenue = liftPerCustomer * n;
              const incProfit = incRevenue * margin;
              const cost = emailCost * n;
              const netProfit = incProfit - cost;
              const roi = (netProfit / cost) * 100;
              const profitable = netProfit > 0;
              return (
                <div key={label} className={`rounded-xl border p-6 ${profitable ? "border-green-100 bg-green-50/30" : "border-red-100 bg-red-50/30"}`}>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ background: color }} />
                      <h3 className="font-semibold text-zinc-900">{label}</h3>
                    </div>
                    <span className={`text-sm font-semibold ${profitable ? "text-green-700" : "text-red-600"}`}>
                      {profitable ? "Profitable" : "Loss-making"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <KpiCard label="Emails sent" value={n.toLocaleString()} />
                    <KpiCard label="Incremental revenue" value={`$${incRevenue.toLocaleString("en", { maximumFractionDigits: 0 })}`} />
                    <KpiCard label="Campaign cost" value={`$${cost.toLocaleString("en", { maximumFractionDigits: 0 })}`} />
                    <KpiCard label="Net profit" value={`${netProfit > 0 ? "+" : ""}$${netProfit.toLocaleString("en", { maximumFractionDigits: 0 })}`} accent={profitable} />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-zinc-400">ROI:</span>
                    <span className={`text-sm font-semibold tabular-nums ${profitable ? "text-green-700" : "text-red-600"}`}>{roi > 0 ? "+" : ""}{roi.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <h3 className="mb-4 text-sm font-semibold text-zinc-700">ROI sensitivity to email cost</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={roiSens}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="cost" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} label={{ value: "Cost per email ($)", position: "insideBottom", offset: -3, fontSize: 11, fill: "#a1a1aa" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" label={{ value: "Break-even", position: "right", fontSize: 11, fill: "#9ca3af" }} />
                  <Line type="monotone" dataKey="mens" name="Men's email" stroke={BLUE} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="womens" name="Women's email" stroke={PINK} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab === "Targeting" && (
          <div className="space-y-8">
            <SectionHeader title="Uplift targeting (T-Learner)" sub="XGBoost T-Learner estimates CATE per customer. Targeting the top deciles improves ROI without emailing everyone." />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KpiCard label="Top 20% targeted" value={`${uplift.gain20.n_targeted.toLocaleString()}`} sub="customers" />
              <KpiCard label="Top 40% targeted" value={`${uplift.gain40.n_targeted.toLocaleString()}`} sub="customers" />
              <KpiCard label="Gain @ top 40%" value={`+${uplift.gain40.gain_vs_blanket_pct?.toFixed(1)}%`} sub="vs. blanket send" accent />
              <KpiCard label="Reduction in send vol." value="60%" sub="at top-40% targeting" />
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <h3 className="mb-4 text-sm font-semibold text-zinc-700">Qini curve — cumulative incremental conversions</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={qiniData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="pct" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="model" name="Uplift model" stroke={BLUE} fill="#dbeafe" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              <h3 className="mb-4 text-sm font-semibold text-zinc-700">CATE distribution — predicted incremental conversion per customer</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={uplift.cate_hist} barCategoryGap="5%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="x" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine x={0} stroke="#ef4444" strokeDasharray="3 3" />
                  <Bar dataKey="y" name="Customers" fill={BLUE} fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab === "Recommendation" && (
          <div className="space-y-6 max-w-3xl">
            <SectionHeader title="One-page marketing recommendation" sub="Portfolio analysis of public dataset · November 2026" />
            <div className="rounded-xl border border-zinc-200 bg-white p-8 space-y-6 text-sm leading-relaxed text-zinc-700">
              <div className="border-b border-zinc-100 pb-6">
                <h3 className="text-base font-semibold text-zinc-900 mb-3">Experiment summary</h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      {["", "Men's Email", "Women's Email", "Control"].map(h => (
                        <th key={h} className="py-2 pr-4 text-left font-medium text-zinc-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {[
                      ["Customers", "21,307", "21,387", "21,306"],
                      ["Conversion rate", `${groups.mens_email.conv_rate}%`, `${groups.womens_email.conv_rate}%`, `${groups.no_email.conv_rate}%`],
                      ["Avg spend", `$${groups.mens_email.avg_spend.toFixed(3)}`, `$${groups.womens_email.avg_spend.toFixed(3)}`, `$${groups.no_email.avg_spend.toFixed(3)}`],
                    ].map(row => (
                      <tr key={row[0]}>
                        {row.map((cell, i) => (
                          <td key={i} className={`py-2 pr-4 ${i === 0 ? "text-zinc-500" : "font-medium text-zinc-800 tabular-nums"}`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-zinc-900">Key findings</h3>
                <div className="space-y-3">
                  {[
                    {
                      title: "Men's email — statistically significant",
                      body: `Conversion lift +${(mens.conv.absolute_lift * 100).toFixed(2)} pp (p < 0.0001). Revenue lift +$${mens.rev.absolute_lift.toFixed(3)}/customer. ROI at $0.10/email: +208%.`,
                    },
                    {
                      title: "Women's email — statistically significant",
                      body: `Conversion lift +${(womens.conv.absolute_lift * 100).toFixed(2)} pp (p = ${womens.conv.p_value}). Revenue lift +$${womens.rev.absolute_lift.toFixed(3)}/customer. ROI at $0.10/email: +70%.`,
                    },
                  ].map(item => (
                    <div key={item.title} className="flex gap-3 rounded-lg bg-zinc-50 p-4">
                      <CheckCircle2 size={14} className="text-green-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-zinc-900">{item.title}</p>
                        <p className="mt-0.5 text-zinc-600">{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-zinc-900">Recommendations</h3>
                {[
                  "Run both email campaigns — both show positive ROI at $0.10/email and are statistically significant.",
                  "Apply uplift targeting — targeting the top 40% by predicted CATE achieves +68% gain in conversion lift, cutting send volume by 60%.",
                  "Do not send women's email to men's-only purchasers — channel relevance is a strong CATE predictor.",
                  "Re-run quarterly — campaign lift varies with season and catalogue changes.",
                ].map((rec, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">{i + 1}</span>
                    <p className="text-zinc-700">{rec}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-400 border-t border-zinc-100 pt-4">
                Portfolio analysis of a public, fully anonymised dataset. Results characterise the dataset only.
              </p>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
