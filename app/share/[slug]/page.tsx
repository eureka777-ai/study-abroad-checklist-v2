"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Material = {
  id: string;
  name: string;
  category: string;
  stage: string | null;
  status: string;
  requirement_level: string;
  deadline: string | null;
  source_url: string | null;
  next_action: string | null;
  how_to_get: string | null;
};

type Profile = {
  id: string;
  display_name: string | null;
  share_slug: string;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const stages = ["申请准备", "提交申请", "等待 Offer", "换 Unconditional", "CAS 与签证", "住宿与付款", "行前准备", "到校注册", "其他"];
const readyStatuses = ["已完成", "已上传", "已确认"];

async function anonRequest<T>(path: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY
    }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "读取失败");
  return data as T;
}

export default function SharePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [message, setMessage] = useState("正在加载分享清单...");

  useEffect(() => {
    if (!slug) return;
    void loadShare(slug);
  }, [slug]);

  const stats = useMemo(() => {
    const required = materials.filter((item) => item.requirement_level === "必需" && item.status !== "不适用");
    const ready = required.filter((item) => readyStatuses.includes(item.status)).length;
    return {
      requiredTotal: required.length,
      ready,
      percent: required.length ? Math.round((ready / required.length) * 100) : 0
    };
  }, [materials]);

  async function loadShare(currentSlug: string) {
    try {
      const profiles = await anonRequest<Profile[]>(`profiles?share_slug=eq.${currentSlug}&select=*`);
      if (!profiles[0]) {
        setMessage("没有找到这个分享清单。");
        return;
      }
      setProfile(profiles[0]);
      const rows = await anonRequest<Material[]>(`materials?user_id=eq.${profiles[0].id}&select=*&order=created_at.asc`);
      setMaterials(rows);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载失败");
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Family View</p>
          <h1>{profile?.display_name || "留学材料"}的进度</h1>
          <p className="subtle">这是只读分享页，可以查看最新材料状态，但不能修改你的清单。</p>
        </div>
        <div className="card panel">
          <p className="subtle">必需材料：{stats.ready} / {stats.requiredTotal}</p>
          <strong className="block text-5xl mt-3">{stats.percent}%</strong>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${stats.percent}%` }} />
          </div>
        </div>
      </section>

      {message ? (
        <section className="card panel"><p className="subtle">{message}</p></section>
      ) : (
        <section className="card panel">
          <h2 className="section-title mb-5">材料时间线</h2>
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
                        {item.source_url && <a className="button button-soft w-fit" href={item.source_url} target="_blank" rel="noopener noreferrer">官方入口</a>}
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
