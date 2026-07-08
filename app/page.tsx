"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Session = {
  access_token: string;
  refresh_token?: string;
  user: { id: string; email?: string };
};

type Profile = {
  id: string;
  display_name: string | null;
  share_slug: string;
};

type Material = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  stage: string | null;
  status: string;
  requirement_level: string;
  deadline: string | null;
  note: string | null;
  source_name: string | null;
  source_url: string | null;
  how_to_get: string | null;
  next_action: string | null;
  applies_to: string | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const statuses = ["未开始", "准备中", "已完成", "已上传", "已确认", "不适用"];
const categories = ["申请材料", "学术材料", "语言材料", "签证材料", "住宿材料", "付款材料", "其他"];
const stages = ["申请准备", "提交申请", "等待 Offer", "换 Unconditional", "CAS 与签证", "住宿与付款", "行前准备", "到校注册", "其他"];
const levels = ["必需", "视情况需要", "可选"];
const readyStatuses = ["已完成", "已上传", "已确认"];

const defaultForm = {
  name: "",
  category: "签证材料",
  stage: "申请准备",
  status: "未开始",
  requirement_level: "必需",
  deadline: "",
  note: "",
  source_name: "",
  source_url: "",
  how_to_get: "",
  next_action: "",
  applies_to: ""
};

const seedMaterials = [
  { name: "护照", category: "签证材料", stage: "申请准备", next_action: "确认有效期，如不足则先换发护照。", applies_to: "留学、签证和出入境几乎都需要。" },
  { name: "中英文成绩单", category: "学术材料", stage: "申请准备", next_action: "向学校教务处申请中英文版本。" },
  { name: "雅思 / 语言成绩单", category: "语言材料", stage: "申请准备", next_action: "确认目标院校语言要求并安排考试。" },
  { name: "Conditional Offer", category: "申请材料", stage: "等待 Offer", next_action: "提交申请后等待学校审核。" },
  { name: "Unconditional Offer", category: "申请材料", stage: "换 Unconditional", next_action: "补齐条件后联系学校换无条件录取。" },
  { name: "CAS", category: "签证材料", stage: "CAS 与签证", next_action: "满足学校要求后等待学校发放 CAS。", source_name: "学校 / GOV.UK", source_url: "https://www.gov.uk/student-visa/documents-you-must-provide", applies_to: "英国学生签证需要。" },
  { name: "TB 肺结核检测证明", category: "签证材料", stage: "CAS 与签证", requirement_level: "视情况需要", next_action: "确认是否需要 TB 检测；如需要，预约官方认可诊所。", source_name: "GOV.UK Approved TB clinics", source_url: "https://www.gov.uk/tb-test-visa" },
  { name: "签证申请表", category: "签证材料", stage: "CAS 与签证", next_action: "进入官方签证申请入口，确认签证类型后开始填写。", source_name: "GOV.UK Student visa apply", source_url: "https://www.gov.uk/student-visa/apply" },
  { name: "IHS 付款证明", category: "付款材料", stage: "CAS 与签证", next_action: "提交英国学生签证申请时按系统提示支付 IHS。" },
  { name: "住宿合同", category: "住宿材料", stage: "住宿与付款", next_action: "确认租期、金额、入住日期和付款计划。" },
  { name: "机票订单", category: "其他", stage: "行前准备", next_action: "签证获批后再确认航班更稳妥。", requirement_level: "可选" }
];

function slugify(email: string) {
  return email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `user-${Date.now()}`;
}

async function authRequest(path: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || data.error_description || data.message || "请求失败");
  return data;
}

async function apiRequest<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || "数据库请求失败");
  return data as T;
}

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const shareUrl = profile ? `${window.location.origin}/share/${profile.share_slug}` : "";

  useEffect(() => {
    const saved = window.localStorage.getItem("study-v2-session");
    if (saved) setSession(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (!session) return;
    void loadUserData(session);
  }, [session]);

  const stats = useMemo(() => {
    const applicable = materials.filter((item) => item.status !== "不适用");
    const required = applicable.filter((item) => item.requirement_level === "必需");
    const readyRequired = required.filter((item) => readyStatuses.includes(item.status)).length;
    return {
      requiredTotal: required.length,
      readyRequired,
      percent: required.length ? Math.round((readyRequired / required.length) * 100) : 0,
      done: materials.filter((item) => item.status === "已完成").length,
      uploaded: materials.filter((item) => item.status === "已上传").length,
      confirmed: materials.filter((item) => item.status === "已确认").length,
      notApplicable: materials.filter((item) => item.status === "不适用").length
    };
  }, [materials]);

  async function handleAuth(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      const data = await authRequest(authMode === "login" ? "token?grant_type=password" : "signup", { email, password });
      if (!data.access_token) {
        setMessage("账号已创建。请检查邮箱确认邮件，然后回来登录。");
        return;
      }
      const nextSession: Session = { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user };
      window.localStorage.setItem("study-v2-session", JSON.stringify(nextSession));
      setSession(nextSession);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登录失败");
    }
  }

  async function loadUserData(currentSession: Session) {
    const token = currentSession.access_token;
    const profiles = await apiRequest<Profile[]>(`profiles?id=eq.${currentSession.user.id}&select=*`, token);
    let currentProfile = profiles[0];
    if (!currentProfile) {
      const [created] = await apiRequest<Profile[]>("profiles", token, {
        method: "POST",
        body: JSON.stringify({
          id: currentSession.user.id,
          display_name: currentSession.user.email?.split("@")[0] || "我",
          share_slug: `${slugify(currentSession.user.email || "user")}-${currentSession.user.id.slice(0, 6)}`
        })
      });
      currentProfile = created;
    }
    setProfile(currentProfile);
    const rows = await apiRequest<Material[]>(`materials?user_id=eq.${currentSession.user.id}&select=*&order=created_at.asc`, token);
    setMaterials(rows);
  }

  async function addSeedMaterials() {
    if (!session) return;
    const existing = new Set(materials.map((item) => item.name));
    const rows = seedMaterials.filter((item) => !existing.has(item.name)).map((item) => ({
      user_id: session.user.id,
      status: "未开始",
      requirement_level: "必需",
      deadline: null,
      note: "",
      source_name: "",
      source_url: "",
      how_to_get: "",
      applies_to: "",
      ...item
    }));
    if (!rows.length) {
      setMessage("默认材料已经添加过了。");
      return;
    }
    await apiRequest<Material[]>("materials", session.access_token, { method: "POST", body: JSON.stringify(rows) });
    await loadUserData(session);
    setMessage(`已添加 ${rows.length} 项默认材料。`);
  }

  async function saveMaterial(event: FormEvent) {
    event.preventDefault();
    if (!session) return;
    const payload = {
      user_id: session.user.id,
      ...form,
      deadline: form.deadline || null
    };
    if (editingId) {
      await apiRequest<Material[]>(`materials?id=eq.${editingId}`, session.access_token, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
    } else {
      await apiRequest<Material[]>("materials", session.access_token, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }
    setForm(defaultForm);
    setEditingId(null);
    await loadUserData(session);
  }

  async function deleteMaterial(id: string) {
    if (!session || !window.confirm("确定删除这项材料吗？")) return;
    await apiRequest(`materials?id=eq.${id}`, session.access_token, { method: "DELETE" });
    await loadUserData(session);
  }

  function startEdit(material: Material) {
    setEditingId(material.id);
    setForm({
      name: material.name,
      category: material.category,
      stage: material.stage || "其他",
      status: material.status,
      requirement_level: material.requirement_level,
      deadline: material.deadline || "",
      note: material.note || "",
      source_name: material.source_name || "",
      source_url: material.source_url || "",
      how_to_get: material.how_to_get || "",
      next_action: material.next_action || "",
      applies_to: material.applies_to || ""
    });
  }

  function logout() {
    window.localStorage.removeItem("study-v2-session");
    setSession(null);
    setProfile(null);
    setMaterials([]);
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return (
      <main className="page">
        <section className="card panel">
          <h1 className="text-3xl font-bold">还差环境变量</h1>
          <p className="subtle mt-3">请先创建 .env.local，填入 Supabase URL 和 Publishable key。</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="page">
        <section className="hero hero-landing">
          <div className="hero-copy">
            <p className="eyebrow">Study Abroad Planner</p>
            <h1>留学材料助手</h1>
            <p className="subtle">把申请、签证、住宿和行前材料放在一个清晰的进度页里。登录后，每个人都有自己的清单。</p>
            <div className="feature-strip" aria-label="核心功能">
              <span>时间线清单</span>
              <span>家人只读分享</span>
              <span>云端同步</span>
            </div>
          </div>
          <form className="card panel auth-box" onSubmit={handleAuth}>
            <h2 className="text-2xl font-bold">{authMode === "login" ? "登录" : "注册"}</h2>
            <input className="input" type="email" placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="input" type="password" placeholder="密码，至少 6 位" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button className="button button-primary" type="submit">{authMode === "login" ? "登录" : "创建账号"}</button>
            <button className="button button-soft" type="button" onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>
              {authMode === "login" ? "没有账号？去注册" : "已有账号？去登录"}
            </button>
            {message && <p className="subtle">{message}</p>}
          </form>
        </section>

        <section className="landing-showcase">
          <div className="preview-board">
            <div className="preview-header">
              <div>
                <p className="eyebrow">Today</p>
                <h2>申请准备</h2>
              </div>
              <div className="mini-progress">
                <strong>62%</strong>
                <span>必需材料</span>
              </div>
            </div>
            <div className="preview-timeline">
              <div className="preview-step active">
                <span />
                <div>
                  <strong>提交申请材料</strong>
                  <p>成绩单、语言成绩、个人陈述</p>
                </div>
              </div>
              <div className="preview-step">
                <span />
                <div>
                  <strong>等待 Offer</strong>
                  <p>Conditional Offer / Unconditional Offer</p>
                </div>
              </div>
              <div className="preview-step">
                <span />
                <div>
                  <strong>CAS 与签证</strong>
                  <p>CAS、IHS、TB 检测、签证申请表</p>
                </div>
              </div>
            </div>
          </div>

          <div className="landing-cards">
            <article>
              <strong>给自己用</strong>
              <p>每个学生登录后都有自己的材料进度，不会和朋友的数据混在一起。</p>
            </article>
            <article>
              <strong>给爸妈看</strong>
              <p>复制只读链接，家人能看到最新状态，但不能误改你的清单。</p>
            </article>
            <article>
              <strong>按流程推进</strong>
              <p>材料按申请、Offer、签证、住宿和行前阶段展示，不再只是一堆待办。</p>
            </article>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="hero">
          <div>
            <p className="eyebrow">Study Abroad Planner</p>
            <h1>我的留学材料</h1>
          <p className="subtle">按真实申请时间线整理材料。你负责更新进度，家人通过分享链接安心查看。</p>
        </div>
        <div className="card panel">
          <p className="subtle">必需材料：{stats.readyRequired} / {stats.requiredTotal}</p>
          <strong className="block text-5xl mt-3">{stats.percent}%</strong>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${stats.percent}%` }} />
          </div>
          <div className="stats mt-5">
            <span className="stat">已完成<strong>{stats.done}</strong></span>
            <span className="stat">已上传<strong>{stats.uploaded}</strong></span>
            <span className="stat">已确认<strong>{stats.confirmed}</strong></span>
            <span className="stat">不适用<strong>{stats.notApplicable}</strong></span>
          </div>
        </div>
      </section>

      <section className="card panel">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div>
            <h2 className="section-title">家庭只读分享</h2>
            <p className="subtle mt-1">把这个链接发给爸妈，他们能看到进度，但不能编辑。</p>
          </div>
          <button className="button button-soft" type="button" onClick={() => navigator.clipboard.writeText(shareUrl)}>复制分享链接</button>
        </div>
        <p className="share-link">{shareUrl}</p>
      </section>

      <section className="card panel">
        <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
          <h2 className="section-title">{editingId ? "编辑材料" : "添加材料"}</h2>
          <div className="flex gap-2">
            <button className="button button-soft" type="button" onClick={addSeedMaterials}>添加默认材料</button>
            <button className="button button-soft" type="button" onClick={logout}>退出登录</button>
          </div>
        </div>
        <form className="grid-form" onSubmit={saveMaterial}>
          <label className="label">材料名称<input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <Select label="分类" value={form.category} options={categories} onChange={(value) => setForm({ ...form, category: value })} />
          <Select label="阶段" value={form.stage} options={stages} onChange={(value) => setForm({ ...form, stage: value })} />
          <Select label="状态" value={form.status} options={statuses} onChange={(value) => setForm({ ...form, status: value })} />
          <Select label="重要程度" value={form.requirement_level} options={levels} onChange={(value) => setForm({ ...form, requirement_level: value })} />
          <label className="label">截止日期<input className="input" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></label>
          <label className="label">来源名称<input className="input" value={form.source_name} onChange={(e) => setForm({ ...form, source_name: e.target.value })} /></label>
          <label className="label">官方入口<input className="input" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} /></label>
          <label className="label col-span-full md:col-span-2">下一步动作<textarea className="input" rows={3} value={form.next_action} onChange={(e) => setForm({ ...form, next_action: e.target.value })} /></label>
          <label className="label col-span-full md:col-span-2">适用情况<textarea className="input" rows={3} value={form.applies_to} onChange={(e) => setForm({ ...form, applies_to: e.target.value })} /></label>
          <label className="label col-span-full">备注<textarea className="input" rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
          <button className="button button-primary" type="submit">{editingId ? "保存修改" : "添加材料"}</button>
          {editingId && <button className="button button-soft" type="button" onClick={() => { setEditingId(null); setForm(defaultForm); }}>取消编辑</button>}
        </form>
        {message && <p className="subtle mt-4">{message}</p>}
      </section>

      <section className="card panel">
        <h2 className="section-title mb-5">我的清单</h2>
        <div className="timeline">
          {stages.map((stage) => {
            const rows = materials.filter((item) => (item.stage || "其他") === stage);
            if (!rows.length) return null;
            return (
              <div className="timeline-group" key={stage}>
                <div className="timeline-title">
                  <span className="timeline-dot" />
                  <div>
                    <h3 className="font-bold text-slate-900">{stage}</h3>
                    <p className="text-sm">{rows.length} 项</p>
                  </div>
                </div>
                <div className="material-grid">
                  {rows.map((item) => (
                    <article className="material-card" key={item.id}>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-bold text-lg">{item.name}</h3>
                        <span className="pill">{item.status}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="pill">{item.category}</span>
                        <span className="pill">{item.requirement_level}</span>
                        {item.deadline && <span className="pill">{item.deadline}</span>}
                      </div>
                      <p className="next-action"><strong>下一步</strong><br />{item.next_action || item.how_to_get || "暂未设置下一步"}</p>
                      <div className="flex flex-wrap gap-2">
                        {item.source_url && <a className="button button-soft" href={item.source_url} target="_blank" rel="noopener noreferrer">官方入口</a>}
                        <button className="button button-soft" type="button" onClick={() => startEdit(item)}>编辑</button>
                        <button className="button button-danger" type="button" onClick={() => deleteMaterial(item.id)}>删除</button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="label">
      {label}
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => <option value={option} key={option}>{option}</option>)}
      </select>
    </label>
  );
}
