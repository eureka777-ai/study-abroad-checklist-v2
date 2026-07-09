const demoMaterials = [
  { name: "护照", level: "必需", status: "已确认", stage: "申请准备", note: "确认有效期和空白页。" },
  { name: "CAS", level: "必需", status: "准备中", stage: "CAS 与签证", note: "满足 offer 条件后由学校发放。" },
  { name: "签证申请表", level: "必需", status: "未开始", stage: "CAS 与签证", note: "通过 GOV.UK 在线填写 Student visa 申请。" },
  { name: "IHS 付款证明", level: "必需", status: "未开始", stage: "CAS 与签证", note: "提交签证申请时按系统提示支付。" },
  { name: "TB 肺结核检测证明", level: "视情况需要", status: "已完成", stage: "CAS 与签证", note: "需要去 Home Office 认可诊所。" },
  { name: "资金证明", level: "视情况需要", status: "准备中", stage: "CAS 与签证", note: "按个人情况确认是否需要提交。" },
  { name: "ATAS 证明", level: "视情况需要", status: "不适用", stage: "CAS 与签证", note: "仅部分敏感技术相关专业需要。" },
  { name: "签证预约确认信", level: "必需", status: "未开始", stage: "CAS 与签证", note: "完成线上申请后保存预约信息。" },
  { name: "住宿合同", level: "可选", status: "准备中", stage: "住宿与付款", note: "确认租期、押金、入住日期。" },
  { name: "机票订单", level: "可选", status: "未开始", stage: "行前准备", note: "建议签证获批后再购买。" }
];

const stages = ["申请准备", "CAS 与签证", "住宿与付款", "行前准备"];
const readyStatuses = ["已完成", "已上传", "已确认"];
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function DemoPage() {
  const required = demoMaterials.filter((item) => item.level === "必需" && item.status !== "不适用");
  const readyRequired = required.filter((item) => readyStatuses.includes(item.status)).length;
  const percent = Math.round((readyRequired / required.length) * 100);

  return (
    <main className="page dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-copy">
          <p className="eyebrow">Pathfolio Demo</p>
          <h1>英国学生签证示例清单</h1>
          <p className="subtle">不用登录也可以先看看：材料会按阶段整理，并标出必需、视情况需要和可选。</p>
          <div className="quick-actions">
            <a className="button button-primary" href={`${BASE_PATH}/`}>免费开始整理材料</a>
            <a className="button button-soft" href={`${BASE_PATH}/`}>返回首页</a>
          </div>
        </div>

        <div className="progress-panel">
          <div className="progress-main">
            <div>
              <span>必需材料</span>
              <strong>{readyRequired} / {required.length}</strong>
            </div>
            <b>{percent}%</b>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${percent}%` }} />
          </div>
          <div className="stats compact-stats">
            <span className="stat">必需<strong>{required.length}</strong></span>
            <span className="stat">视情况<strong>{demoMaterials.filter((item) => item.level === "视情况需要").length}</strong></span>
            <span className="stat">可选<strong>{demoMaterials.filter((item) => item.level === "可选").length}</strong></span>
            <span className="stat">已确认<strong>{demoMaterials.filter((item) => item.status === "已确认").length}</strong></span>
          </div>
        </div>
      </section>

      <section className="next-step-card">
        <div>
          <p className="eyebrow">Next Step</p>
          <h2>下一步：CAS</h2>
          <p>满足 offer 条件后等待学校生成 CAS；拿到 CAS 后再继续填写英国学生签证申请。</p>
        </div>
        <a className="button button-soft" href="https://www.gov.uk/student-visa/documents-you-must-provide" target="_blank" rel="noopener noreferrer">查看官方说明</a>
      </section>

      <section className="card panel">
        <h2 className="section-title mb-5">材料时间线</h2>
        <div className="timeline">
          {stages.map((stage) => {
            const rows = demoMaterials.filter((item) => item.stage === stage);
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
                    <article className="material-card" key={item.name}>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-bold text-lg">{item.name}</h3>
                        <span className="pill">{item.status}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="pill">{item.level}</span>
                        <span className="pill">{stage}</span>
                      </div>
                      <p className="next-action"><strong>说明</strong><br />{item.note}</p>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="legal-notice" aria-label="使用说明和隐私提示">
        <div>
          <p className="eyebrow" lang="en">privacy note</p>
          <h2>使用前的小提醒</h2>
        </div>
        <div className="legal-grid">
          <p>这是示例清单，只用于理解产品流程。正式申请时，请以学校、使馆、移民局或官方签证网站为准。</p>
          <p>真实使用时建议只记录材料状态和官方入口，不要填写护照、身份证、银行流水等敏感原件信息。</p>
          <p>家人分享链接是只读页面，可以查看进度，但不能编辑你的清单。</p>
        </div>
      </section>
    </main>
  );
}
