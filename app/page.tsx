"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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

type TemplateMaterial = {
  name: string;
  category: string;
  stage: string;
  status?: string;
  requirement_level?: string;
  deadline?: string | null;
  note?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  how_to_get?: string | null;
  next_action?: string | null;
  applies_to?: string | null;
};

type CustomTemplate = {
  id: string;
  title: string;
  createdAt: string;
  materials: TemplateMaterial[];
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const FEEDBACK_URL = "https://example.com/feedback";
const CUSTOM_TEMPLATE_PREFIX = "pathfolio-custom-templates";

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

type FormErrors = Partial<Record<keyof typeof defaultForm, string>>;

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

const templateCards = [
  {
    title: "英国留学申请",
    description: "申请学校前后最常用的一组材料。",
    meta: "学术 · 语言 · Offer",
    materials: [
      { name: "护照", category: "签证材料", stage: "申请准备", next_action: "确认有效期，如不足则先换发护照。", applies_to: "留学、签证和出入境几乎都需要。" },
      { name: "中英文成绩单", category: "学术材料", stage: "申请准备", next_action: "向学校教务处申请中英文版本。" },
      { name: "毕业证", category: "学术材料", stage: "申请准备", next_action: "向学校申请中文和英文版本，未毕业时可先准备在读证明。" },
      { name: "学位证", category: "学术材料", stage: "申请准备", next_action: "向学校申请中文和英文版本。" },
      { name: "雅思 / 语言成绩单", category: "语言材料", stage: "申请准备", next_action: "确认目标院校语言要求并安排考试。" },
      { name: "个人陈述 PS", category: "申请材料", stage: "提交申请", next_action: "根据目标专业整理经历、动机和职业规划。" },
      { name: "推荐信", category: "申请材料", stage: "提交申请", next_action: "提前联系老师或上级，确认推荐信提交方式。" },
      { name: "Conditional Offer", category: "申请材料", stage: "等待 Offer", next_action: "提交申请后等待学校审核。" },
      { name: "Unconditional Offer", category: "申请材料", stage: "换 Unconditional", next_action: "补齐条件后联系学校换无条件录取。" }
    ]
  },
  {
    title: "英国学生签证",
    description: "拿到 Offer 后进入 CAS 和签证阶段。",
    meta: "CAS · IHS · TB · 资金",
    materials: [
      { name: "CAS", category: "签证材料", stage: "CAS 与签证", next_action: "满足学校要求后等待学校发放 CAS。", source_name: "学校 / GOV.UK", source_url: "https://www.gov.uk/student-visa/documents-you-must-provide", applies_to: "英国学生签证需要。" },
      { name: "签证申请表", category: "签证材料", stage: "CAS 与签证", next_action: "进入官方签证申请入口，确认签证类型后开始填写。", source_name: "GOV.UK Student visa apply", source_url: "https://www.gov.uk/student-visa/apply" },
      { name: "IHS 付款证明", category: "付款材料", stage: "CAS 与签证", next_action: "提交英国学生签证申请时按系统提示支付 IHS。" },
      { name: "TB 肺结核检测证明", category: "签证材料", stage: "CAS 与签证", requirement_level: "视情况需要", next_action: "确认是否需要 TB 检测；如需要，预约官方认可诊所。", source_name: "GOV.UK Approved TB clinics", source_url: "https://www.gov.uk/tb-test-visa" },
      { name: "资金证明", category: "签证材料", stage: "CAS 与签证", requirement_level: "视情况需要", next_action: "确认自己是否需要提交资金证明，并检查存款时间要求。" },
      { name: "签证预约确认信", category: "签证材料", stage: "CAS 与签证", next_action: "完成线上申请后保存预约确认信息。" }
    ]
  },
  {
    title: "住宿与付款",
    description: "确认住哪里、付了什么、什么时候入住。",
    meta: "住宿 · 押金 · 学费",
    materials: [
      { name: "住宿合同", category: "住宿材料", stage: "住宿与付款", next_action: "确认租期、金额、入住日期和付款计划。" },
      { name: "住宿押金付款证明", category: "付款材料", stage: "住宿与付款", next_action: "保存付款截图、收据或邮件确认。" },
      { name: "学费付款证明", category: "付款材料", stage: "住宿与付款", next_action: "保存学校系统或银行付款记录。" },
      { name: "Offer 接受确认", category: "申请材料", stage: "住宿与付款", next_action: "确认是否已接受学校 offer 并保存邮件。" }
    ]
  },
  {
    title: "行前准备",
    description: "签证获批后，出发前逐项确认。",
    meta: "机票 · 保险 · 到校",
    materials: [
      { name: "机票订单", category: "其他", stage: "行前准备", next_action: "签证获批后再确认航班更稳妥。", requirement_level: "可选" },
      { name: "保险信息", category: "其他", stage: "行前准备", next_action: "确认学校、住宿或个人保险安排。" },
      { name: "接机 / 到校注册信息", category: "其他", stage: "到校注册", next_action: "保存学校注册、接机或报到安排。" },
      { name: "eVisa / BRP 信息", category: "签证材料", stage: "到校注册", requirement_level: "视情况需要", next_action: "根据签证获批邮件确认线上身份或 BRP 领取方式。" }
    ]
  },
  {
    title: "申根旅游签（在职）",
    description: "适合有工作、计划去申根区短期旅行的人。",
    meta: "行程 · 在职 · 资金",
    materials: [
      { name: "申根签证申请表", category: "签证材料", stage: "申请准备", next_action: "按主要目的国或停留最久国家的签证中心要求填写。", source_name: "EU Schengen visa guidance", source_url: "https://home-affairs.ec.europa.eu/policies/schengen/visa-policy/applying-schengen-visa_en" },
      { name: "护照及旧护照", category: "签证材料", stage: "申请准备", next_action: "检查有效期、空白页和旧签证记录。" },
      { name: "申根旅行保险", category: "签证材料", stage: "提交申请", next_action: "购买覆盖申根区和完整旅行日期的保险。" },
      { name: "往返机票预订单", category: "签证材料", stage: "提交申请", next_action: "准备与行程一致的机票预订单。" },
      { name: "酒店预订单 / 住宿证明", category: "住宿材料", stage: "提交申请", next_action: "准备覆盖全程的住宿证明。" },
      { name: "英文在职证明", category: "签证材料", stage: "提交申请", next_action: "向公司申请盖章版在职证明和准假说明。", applies_to: "在职申请人常用。" },
      { name: "银行流水 / 资金证明", category: "签证材料", stage: "提交申请", next_action: "按目的国签证中心要求准备近几个月流水或存款证明。" }
    ]
  },
  {
    title: "申根旅游签（学生）",
    description: "适合在读学生去欧洲短期旅行。",
    meta: "在读 · 亲属资助 · 行程",
    materials: [
      { name: "申根签证申请表", category: "签证材料", stage: "申请准备", next_action: "按目的国签证中心要求填写并预约。", source_name: "EU Schengen visa guidance", source_url: "https://home-affairs.ec.europa.eu/policies/schengen/visa-policy/applying-schengen-visa_en" },
      { name: "在读证明", category: "学术材料", stage: "提交申请", next_action: "向学校申请英文在读证明或中英文版本。" },
      { name: "学生证 / 学校证明", category: "学术材料", stage: "提交申请", next_action: "按签证中心要求准备复印件或翻译件。" },
      { name: "父母资金证明", category: "签证材料", stage: "提交申请", next_action: "如由父母资助，准备父母流水、关系证明和资助说明。" },
      { name: "旅行保险", category: "签证材料", stage: "提交申请", next_action: "购买符合申根要求的旅行保险。" },
      { name: "行程单", category: "签证材料", stage: "提交申请", next_action: "列出城市、日期、交通和住宿安排。" }
    ]
  },
  {
    title: "申根商务签",
    description: "适合会议、展会、商务拜访等短期访问。",
    meta: "邀请函 · 在职 · 行程",
    materials: [
      { name: "商务邀请函", category: "签证材料", stage: "提交申请", next_action: "向欧洲邀请方索取含访问目的、日期和联系人信息的邀请函。" },
      { name: "派遣函 / 在职证明", category: "签证材料", stage: "提交申请", next_action: "由所在公司出具派遣说明、职位、收入和费用承担信息。" },
      { name: "营业执照 / 公司证明", category: "签证材料", stage: "提交申请", next_action: "按签证中心要求准备公司资质文件。" },
      { name: "申根签证申请表", category: "签证材料", stage: "申请准备", next_action: "按主要目的国要求填写。", source_name: "EU Schengen visa guidance", source_url: "https://home-affairs.ec.europa.eu/policies/schengen/visa-policy/applying-schengen-visa_en" },
      { name: "旅行保险", category: "签证材料", stage: "提交申请", next_action: "购买覆盖商务行程的申根旅行保险。" }
    ]
  },
  {
    title: "日本旅游签",
    description: "适合赴日短期旅游，材料按所在地领区确认。",
    meta: "申请表 · 财力 · 行程",
    materials: [
      { name: "日本签证申请表", category: "签证材料", stage: "申请准备", next_action: "按日本使领馆或指定代办机构要求填写。", source_name: "Japan MOFA visa information", source_url: "https://www.mofa.go.jp/j_info/visit/visa/index.html" },
      { name: "护照", category: "签证材料", stage: "申请准备", next_action: "检查有效期和空白页。" },
      { name: "照片", category: "签证材料", stage: "申请准备", next_action: "按日本签证照片规格准备。" },
      { name: "赴日行程表", category: "签证材料", stage: "提交申请", next_action: "准备每日行程、酒店和交通计划。" },
      { name: "财力证明", category: "签证材料", stage: "提交申请", next_action: "按代办机构和领区要求准备流水、收入或存款证明。" },
      { name: "在职 / 在读证明", category: "签证材料", stage: "提交申请", requirement_level: "视情况需要", next_action: "按个人身份准备在职证明或在读证明。" }
    ]
  },
  {
    title: "日本商务 / 访友签",
    description: "适合商务访问、探亲访友等短期赴日。",
    meta: "邀请 · 身元保证 · 关系",
    materials: [
      { name: "日本签证申请表", category: "签证材料", stage: "申请准备", next_action: "按日本使领馆或代办机构要求填写。", source_name: "Japan MOFA visa information", source_url: "https://www.mofa.go.jp/j_info/visit/visa/index.html" },
      { name: "邀请理由书", category: "签证材料", stage: "提交申请", next_action: "由日本邀请方准备，说明邀请目的和行程。" },
      { name: "身元保证书", category: "签证材料", stage: "提交申请", requirement_level: "视情况需要", next_action: "按签证类型和邀请方情况确认是否需要。" },
      { name: "滞在预定表", category: "签证材料", stage: "提交申请", next_action: "列出在日本期间的访问安排。" },
      { name: "关系证明 / 商务证明", category: "签证材料", stage: "提交申请", next_action: "访友准备关系说明；商务准备双方公司关系或业务材料。" }
    ]
  },
  {
    title: "美国 B1/B2 签证",
    description: "适合旅游、探亲、短期商务等非移民访问。",
    meta: "DS-160 · 预约 · 面签",
    materials: [
      { name: "DS-160 确认页", category: "签证材料", stage: "申请准备", next_action: "在线填写 DS-160 后保存确认页。", source_name: "U.S. Department of State DS-160", source_url: "https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/forms/ds-160-online-nonimmigrant-visa-application.html" },
      { name: "签证预约确认页", category: "签证材料", stage: "提交申请", next_action: "完成缴费和预约后保存确认页。" },
      { name: "护照", category: "签证材料", stage: "申请准备", next_action: "检查有效期和旧签证记录。" },
      { name: "照片", category: "签证材料", stage: "申请准备", next_action: "按美国签证照片规格准备电子版或纸质版。" },
      { name: "行程计划", category: "签证材料", stage: "提交申请", requirement_level: "可选", next_action: "准备旅行目的、城市、日期和预算说明。" },
      { name: "在职 / 在读 / 资金辅助材料", category: "签证材料", stage: "提交申请", requirement_level: "视情况需要", next_action: "按个人身份准备能说明约束力和支付能力的材料。" }
    ]
  },
  {
    title: "美国留学申请",
    description: "适合申请美国本科、硕士、博士和交换项目。",
    meta: "成绩 · 语言 · 文书",
    materials: [
      { name: "护照", category: "签证材料", stage: "申请准备", next_action: "确认有效期，后续申请学校和 F-1 签证都会用到。" },
      { name: "中英文成绩单", category: "学术材料", stage: "申请准备", next_action: "向学校申请官方中英文成绩单，部分学校可能要求 WES 等认证。", requirement_level: "必需" },
      { name: "毕业证 / 在读证明", category: "学术材料", stage: "申请准备", requirement_level: "视情况需要", next_action: "已毕业准备毕业证和学位证；未毕业准备在读证明。" },
      { name: "语言成绩 TOEFL / IELTS / Duolingo", category: "语言材料", stage: "申请准备", next_action: "按目标学校要求送分或上传成绩。" },
      { name: "GRE / GMAT / SAT / ACT", category: "学术材料", stage: "申请准备", requirement_level: "视情况需要", next_action: "根据项目要求确认是否需要标化考试。" },
      { name: "个人陈述 Personal Statement", category: "申请材料", stage: "提交申请", next_action: "说明申请动机、学术背景、项目匹配度和未来计划。" },
      { name: "简历 CV / Resume", category: "申请材料", stage: "提交申请", next_action: "整理教育经历、科研、实习、项目和技能。" },
      { name: "推荐信", category: "申请材料", stage: "提交申请", next_action: "提前联系推荐人，确认学校系统提交方式。" },
      { name: "作品集 / Writing Sample", category: "申请材料", stage: "提交申请", requirement_level: "视情况需要", next_action: "艺术、建筑、传媒、研究型项目可能需要额外作品或写作样本。" },
      { name: "财力证明", category: "签证材料", stage: "等待 Offer", requirement_level: "视情况需要", next_action: "部分学校发 I-20 前会要求提交资金证明。" },
      { name: "录取信 / Admission Letter", category: "申请材料", stage: "等待 Offer", next_action: "提交申请后等待学校审核和录取结果。" },
      { name: "入学押金付款证明", category: "付款材料", stage: "换 Unconditional", requirement_level: "视情况需要", next_action: "确认入读学校后按要求支付 enrollment deposit 并保存收据。" }
    ]
  },
  {
    title: "美国 F-1 学生签证",
    description: "适合去美国读书的学生签证准备。",
    meta: "I-20 · SEVIS · DS-160",
    materials: [
      { name: "I-20", category: "签证材料", stage: "CAS 与签证", next_action: "由美国学校签发，检查姓名、项目和费用信息。", source_name: "Study in the States", source_url: "https://studyinthestates.dhs.gov/students/prepare/students-and-the-form-i-20" },
      { name: "SEVIS I-901 付款证明", category: "付款材料", stage: "CAS 与签证", next_action: "面签前支付 SEVIS fee 并保存确认页。" },
      { name: "DS-160 确认页", category: "签证材料", stage: "CAS 与签证", next_action: "填写 DS-160 并保存确认页。", source_name: "U.S. Department of State DS-160", source_url: "https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/forms/ds-160-online-nonimmigrant-visa-application.html" },
      { name: "签证预约确认页", category: "签证材料", stage: "CAS 与签证", next_action: "完成预约后保存确认页。" },
      { name: "录取信", category: "申请材料", stage: "CAS 与签证", next_action: "准备学校 offer 或 admission letter。" },
      { name: "资金证明", category: "签证材料", stage: "CAS 与签证", next_action: "准备覆盖学费和生活费的资金说明。" }
    ]
  },
  {
    title: "加拿大留学申请",
    description: "适合申请加拿大大学、学院和研究生项目。",
    meta: "学术 · 语言 · Offer",
    materials: [
      { name: "护照", category: "签证材料", stage: "申请准备", next_action: "确认有效期，后续申请学校和学习许可都会用到。" },
      { name: "中英文成绩单", category: "学术材料", stage: "申请准备", next_action: "向学校申请官方中英文成绩单。" },
      { name: "毕业证 / 在读证明", category: "学术材料", stage: "申请准备", requirement_level: "视情况需要", next_action: "已毕业准备毕业证；未毕业准备在读证明。" },
      { name: "语言成绩", category: "语言材料", stage: "申请准备", next_action: "按学校要求准备 IELTS、TOEFL、Duolingo 等成绩。" },
      { name: "个人陈述 / Study Plan", category: "申请材料", stage: "提交申请", requirement_level: "视情况需要", next_action: "按项目要求说明学习背景、目标和选校原因。" },
      { name: "推荐信", category: "申请材料", stage: "提交申请", requirement_level: "视情况需要", next_action: "提前联系老师或上级确认推荐方式。" },
      { name: "录取通知书", category: "申请材料", stage: "等待 Offer", next_action: "提交申请后等待学校发放 offer。" },
      { name: "学费押金付款证明", category: "付款材料", stage: "住宿与付款", requirement_level: "视情况需要", next_action: "按学校要求支付押金后保存收据。" }
    ]
  },
  {
    title: "加拿大学习许可",
    description: "适合去加拿大长期学习，需要准备 Study Permit。",
    meta: "LOA · PAL · 资金",
    materials: [
      { name: "录取通知书 LOA", category: "申请材料", stage: "CAS 与签证", next_action: "准备加拿大学校发放的 Letter of Acceptance。", source_name: "IRCC Study permit", source_url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html" },
      { name: "省级证明信 PAL / TAL", category: "签证材料", stage: "CAS 与签证", requirement_level: "视情况需要", next_action: "确认自己是否需要 PAL 或 TAL，通常由学校协助提供。" },
      { name: "护照", category: "签证材料", stage: "CAS 与签证", next_action: "确认有效期覆盖学习计划。" },
      { name: "资金证明", category: "签证材料", stage: "CAS 与签证", next_action: "准备学费、生活费和返程费用相关证明。" },
      { name: "学习计划 Study Plan", category: "签证材料", stage: "CAS 与签证", requirement_level: "视情况需要", next_action: "说明学习目的、课程选择和回国/未来计划。" },
      { name: "体检回执", category: "签证材料", stage: "CAS 与签证", requirement_level: "视情况需要", next_action: "按 IRCC 要求确认是否需要提前体检。" },
      { name: "生物识别预约 / 回执", category: "签证材料", stage: "CAS 与签证", requirement_level: "视情况需要", next_action: "提交申请后按要求预约并完成 biometrics。" }
    ]
  },
  {
    title: "澳洲留学申请",
    description: "适合申请澳洲本科、硕士和语言课程。",
    meta: "学术 · 语言 · CoE",
    materials: [
      { name: "护照", category: "签证材料", stage: "申请准备", next_action: "确认有效期，学校申请和签证都会用到。" },
      { name: "中英文成绩单", category: "学术材料", stage: "申请准备", next_action: "准备官方中英文版本。" },
      { name: "毕业证 / 在读证明", category: "学术材料", stage: "申请准备", requirement_level: "视情况需要", next_action: "按学历阶段准备毕业证明或在读证明。" },
      { name: "语言成绩", category: "语言材料", stage: "申请准备", next_action: "按学校要求准备 IELTS、PTE、TOEFL 等成绩。" },
      { name: "个人陈述 / 简历", category: "申请材料", stage: "提交申请", requirement_level: "视情况需要", next_action: "按专业要求准备 PS、CV 或作品集。" },
      { name: "Offer", category: "申请材料", stage: "等待 Offer", next_action: "提交申请后等待学校发放录取。" },
      { name: "接受 Offer 确认", category: "申请材料", stage: "换 Unconditional", next_action: "按学校要求接受录取并确认入学条件。" },
      { name: "CoE", category: "签证材料", stage: "CAS 与签证", next_action: "缴费并满足入学条件后，由学校发放 Confirmation of Enrolment。" }
    ]
  },
  {
    title: "澳洲学生签证 500",
    description: "适合申请澳洲 Subclass 500 学生签证。",
    meta: "CoE · OSHC · GTE",
    materials: [
      { name: "CoE", category: "签证材料", stage: "CAS 与签证", next_action: "准备学校发放的 Confirmation of Enrolment。", source_name: "Australia Student visa 500", source_url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500" },
      { name: "护照", category: "签证材料", stage: "CAS 与签证", next_action: "确认有效期和个人信息。" },
      { name: "OSHC 海外学生保险", category: "签证材料", stage: "CAS 与签证", next_action: "购买覆盖学习期间的 Overseas Student Health Cover。" },
      { name: "资金证明", category: "签证材料", stage: "CAS 与签证", requirement_level: "视情况需要", next_action: "按签证系统和个人情况准备资金材料。" },
      { name: "Genuine Student 说明", category: "签证材料", stage: "CAS 与签证", next_action: "说明真实学习目的、课程选择和未来计划。" },
      { name: "体检", category: "签证材料", stage: "CAS 与签证", requirement_level: "视情况需要", next_action: "按签证系统提示预约体检。" },
      { name: "学历和语言材料", category: "学术材料", stage: "CAS 与签证", requirement_level: "视情况需要", next_action: "按签证材料清单上传成绩、学历和语言证明。" }
    ]
  },
  {
    title: "新西兰学生签证",
    description: "适合去新西兰长期学习的学生。",
    meta: "Offer · 资金 · 保险",
    materials: [
      { name: "录取通知书", category: "申请材料", stage: "CAS 与签证", next_action: "准备新西兰学校发放的 offer of place。", source_name: "Immigration New Zealand Student visa", source_url: "https://www.immigration.govt.nz/new-zealand-visas/visas/visa/full-fee-paying-student-visa" },
      { name: "护照", category: "签证材料", stage: "CAS 与签证", next_action: "确认有效期。" },
      { name: "资金证明", category: "签证材料", stage: "CAS 与签证", next_action: "准备覆盖学费、生活费和返程安排的资金材料。" },
      { name: "学费付款证明", category: "付款材料", stage: "住宿与付款", requirement_level: "视情况需要", next_action: "按学校和签证要求保存付款证明。" },
      { name: "住宿安排", category: "住宿材料", stage: "住宿与付款", requirement_level: "视情况需要", next_action: "准备学校住宿、租房或寄宿家庭信息。" },
      { name: "保险证明", category: "其他", stage: "行前准备", requirement_level: "视情况需要", next_action: "确认学校或签证是否要求医疗/旅行保险。" },
      { name: "体检 / 无犯罪证明", category: "签证材料", stage: "CAS 与签证", requirement_level: "视情况需要", next_action: "按停留时长和系统提示确认是否需要。" }
    ]
  },
  {
    title: "欧洲留学申请通用",
    description: "适合德国、法国、荷兰、爱尔兰等欧洲院校申请前期。",
    meta: "学术 · 语言 · 动机信",
    materials: [
      { name: "护照", category: "签证材料", stage: "申请准备", next_action: "确认有效期。" },
      { name: "中英文成绩单", category: "学术材料", stage: "申请准备", next_action: "准备学校认可的官方版本，必要时做公证或认证。" },
      { name: "毕业证 / 在读证明", category: "学术材料", stage: "申请准备", next_action: "按学校要求准备学历证明。" },
      { name: "语言成绩", category: "语言材料", stage: "申请准备", next_action: "按项目语言准备 IELTS、TOEFL、德语、法语等证明。" },
      { name: "动机信 Motivation Letter", category: "申请材料", stage: "提交申请", next_action: "说明选校、选专业原因和未来规划。" },
      { name: "简历 CV", category: "申请材料", stage: "提交申请", next_action: "整理教育经历、项目经历、实习和技能。" },
      { name: "推荐信", category: "申请材料", stage: "提交申请", requirement_level: "视情况需要", next_action: "按项目要求联系推荐人。" },
      { name: "课程描述 / Syllabus", category: "学术材料", stage: "提交申请", requirement_level: "视情况需要", next_action: "部分欧洲学校会要求课程描述用于匹配学分。" },
      { name: "录取通知书", category: "申请材料", stage: "等待 Offer", next_action: "提交申请后等待学校审核。" }
    ]
  },
  {
    title: "德国学生签证",
    description: "适合去德国读本科、硕士或语言预科。",
    meta: "录取 · APS · 资金",
    materials: [
      { name: "德国大学录取通知书", category: "申请材料", stage: "CAS 与签证", next_action: "准备德国学校的 Zulassung 或 admission letter。" },
      { name: "护照", category: "签证材料", stage: "CAS 与签证", next_action: "确认有效期和空白页。" },
      { name: "签证申请表", category: "签证材料", stage: "CAS 与签证", next_action: "按德国使领馆或签证中心要求填写。", source_name: "German Missions visa information", source_url: "https://china.diplo.de/cn-zh/service/visa-einreise" },
      { name: "APS 证书", category: "学术材料", stage: "CAS 与签证", requirement_level: "视情况需要", next_action: "中国大陆学历申请德国通常需关注 APS 审核要求。" },
      { name: "资金证明 / Sperrkonto", category: "签证材料", stage: "CAS 与签证", next_action: "按德国签证要求准备自保金或奖学金证明。" },
      { name: "医疗保险证明", category: "签证材料", stage: "CAS 与签证", next_action: "准备德国认可的保险证明。" },
      { name: "学历和语言材料", category: "学术材料", stage: "CAS 与签证", next_action: "准备学历、成绩和语言证明。" }
    ]
  },
  {
    title: "法国学生签证",
    description: "适合去法国长期学习，需要关注 Etudes en France 流程。",
    meta: "EEF · 录取 · 长居签",
    materials: [
      { name: "学校录取通知书", category: "申请材料", stage: "CAS 与签证", next_action: "准备法国学校录取或预注册证明。" },
      { name: "Etudes en France 材料", category: "申请材料", stage: "CAS 与签证", requirement_level: "视情况需要", next_action: "按 Campus France / EEF 流程填写并提交材料。", source_name: "Campus France China", source_url: "https://www.chine.campusfrance.org/" },
      { name: "长期签证申请表", category: "签证材料", stage: "CAS 与签证", next_action: "按 France-Visas 官方流程填写。", source_name: "France-Visas", source_url: "https://france-visas.gouv.fr/" },
      { name: "护照", category: "签证材料", stage: "CAS 与签证", next_action: "确认有效期。" },
      { name: "资金证明", category: "签证材料", stage: "CAS 与签证", next_action: "按法国签证要求准备生活费和学费证明。" },
      { name: "住宿证明", category: "住宿材料", stage: "住宿与付款", requirement_level: "视情况需要", next_action: "准备住房证明、接待证明或临时住宿安排。" },
      { name: "学历和语言材料", category: "学术材料", stage: "CAS 与签证", next_action: "准备学历、成绩、语言证明和翻译件。" }
    ]
  },
  {
    title: "荷兰学生签证",
    description: "适合去荷兰读书，通常由学校协助 MVV / residence permit。",
    meta: "录取 · MVV · 资金",
    materials: [
      { name: "荷兰学校录取通知书", category: "申请材料", stage: "CAS 与签证", next_action: "准备学校 admission letter。" },
      { name: "护照", category: "签证材料", stage: "CAS 与签证", next_action: "确认有效期。" },
      { name: "学校签证申请包", category: "签证材料", stage: "CAS 与签证", next_action: "荷兰学生居留通常由学校作为担保方发起，请按学校要求提交材料。", source_name: "IND Study in the Netherlands", source_url: "https://ind.nl/en/residence-permits/study" },
      { name: "资金证明", category: "签证材料", stage: "CAS 与签证", next_action: "按学校和 IND 要求准备生活费证明。" },
      { name: "Antecedents Certificate", category: "签证材料", stage: "CAS 与签证", requirement_level: "视情况需要", next_action: "按学校提供的表格确认是否需要签署。" },
      { name: "结核检测预约 / TB test", category: "签证材料", stage: "到校注册", requirement_level: "视情况需要", next_action: "抵达后按 IND 或 GGD 要求确认是否需要 TB 检测。" },
      { name: "住宿安排", category: "住宿材料", stage: "住宿与付款", requirement_level: "视情况需要", next_action: "荷兰住宿紧张，建议尽早确认租房或学校住宿。" }
    ]
  },
  {
    title: "爱尔兰学生签证",
    description: "适合去爱尔兰读语言、本科、硕士等课程。",
    meta: "Offer · 学费 · 资金",
    materials: [
      { name: "学校录取通知书", category: "申请材料", stage: "CAS 与签证", next_action: "准备爱尔兰学校 offer 或 acceptance letter。", source_name: "Irish Immigration study visa", source_url: "https://www.irishimmigration.ie/coming-to-study-in-ireland/" },
      { name: "护照", category: "签证材料", stage: "CAS 与签证", next_action: "确认有效期。" },
      { name: "签证申请表 / AVATS", category: "签证材料", stage: "CAS 与签证", next_action: "通过爱尔兰官方在线系统填写申请。" },
      { name: "学费付款证明", category: "付款材料", stage: "住宿与付款", requirement_level: "视情况需要", next_action: "按课程和签证要求保存学费付款记录。" },
      { name: "资金证明", category: "签证材料", stage: "CAS 与签证", next_action: "准备生活费、学费和资金来源材料。" },
      { name: "学历和语言材料", category: "学术材料", stage: "CAS 与签证", next_action: "准备成绩、学历、语言成绩和翻译件。" },
      { name: "医疗保险", category: "其他", stage: "行前准备", requirement_level: "视情况需要", next_action: "按学校或签证要求购买医疗保险。" }
    ]
  },
  {
    title: "新加坡留学申请",
    description: "适合申请新加坡本科、硕士和私立院校课程。",
    meta: "学术 · 语言 · Offer",
    materials: [
      { name: "护照", category: "签证材料", stage: "申请准备", next_action: "确认有效期，后续学校申请和学生准证都会用到。" },
      { name: "中英文成绩单", category: "学术材料", stage: "申请准备", next_action: "准备学校认可的官方成绩单。" },
      { name: "毕业证 / 在读证明", category: "学术材料", stage: "申请准备", requirement_level: "视情况需要", next_action: "按当前学历阶段准备。" },
      { name: "语言成绩", category: "语言材料", stage: "申请准备", requirement_level: "视情况需要", next_action: "按学校要求准备 IELTS、TOEFL 或其他英语证明。" },
      { name: "个人陈述 / 简历", category: "申请材料", stage: "提交申请", requirement_level: "视情况需要", next_action: "按项目要求准备 PS、CV 或面试材料。" },
      { name: "推荐信", category: "申请材料", stage: "提交申请", requirement_level: "视情况需要", next_action: "研究生项目通常需要提前联系推荐人。" },
      { name: "录取通知书", category: "申请材料", stage: "等待 Offer", next_action: "提交申请后等待学校录取结果。" }
    ]
  },
  {
    title: "新加坡学生准证",
    description: "适合拿到新加坡学校录取后的 Student's Pass 准备。",
    meta: "IPA · SOLAR · 体检",
    materials: [
      { name: "学校录取通知书", category: "申请材料", stage: "CAS 与签证", next_action: "准备新加坡学校发放的录取文件。" },
      { name: "Student's Pass 申请信息", category: "签证材料", stage: "CAS 与签证", next_action: "按学校指引进入 ICA / SOLAR 流程。", source_name: "Singapore ICA Student's Pass", source_url: "https://www.ica.gov.sg/reside/STP/apply" },
      { name: "护照", category: "签证材料", stage: "CAS 与签证", next_action: "确认有效期和个人信息。" },
      { name: "照片", category: "签证材料", stage: "CAS 与签证", next_action: "按 ICA 照片规格准备电子照片。" },
      { name: "IPA Letter", category: "签证材料", stage: "CAS 与签证", next_action: "申请获批后保存 IPA，用于入境和后续换取学生准证。" },
      { name: "体检报告", category: "签证材料", stage: "到校注册", requirement_level: "视情况需要", next_action: "按学校或 ICA 要求完成体检。" },
      { name: "学费付款证明", category: "付款材料", stage: "住宿与付款", requirement_level: "视情况需要", next_action: "保存学校缴费记录。" }
    ]
  },
  {
    title: "中国香港留学申请",
    description: "适合申请香港高校本科、硕士和研究型项目。",
    meta: "学术 · 语言 · Offer",
    materials: [
      { name: "身份证明 / 护照", category: "签证材料", stage: "申请准备", next_action: "按学校系统要求准备身份证、港澳通行证或护照信息。" },
      { name: "中英文成绩单", category: "学术材料", stage: "申请准备", next_action: "向学校申请官方中英文成绩单。" },
      { name: "毕业证 / 在读证明", category: "学术材料", stage: "申请准备", requirement_level: "视情况需要", next_action: "根据是否毕业准备对应证明。" },
      { name: "语言成绩", category: "语言材料", stage: "申请准备", next_action: "按学校要求准备 IELTS、TOEFL、CET 等证明。" },
      { name: "个人陈述 / 研究计划", category: "申请材料", stage: "提交申请", requirement_level: "视情况需要", next_action: "授课型通常准备 PS；研究型通常准备 research proposal。" },
      { name: "推荐信", category: "申请材料", stage: "提交申请", requirement_level: "视情况需要", next_action: "按项目要求联系推荐人。" },
      { name: "录取通知书", category: "申请材料", stage: "等待 Offer", next_action: "提交申请后等待学校录取。" }
    ]
  },
  {
    title: "中国香港学生签证",
    description: "适合拿到香港学校录取后的学生签证 / 入境许可准备。",
    meta: "ID995A · 录取 · 资金",
    materials: [
      { name: "录取通知书", category: "申请材料", stage: "CAS 与签证", next_action: "准备香港学校发放的正式录取文件。" },
      { name: "ID995A 申请表", category: "签证材料", stage: "CAS 与签证", next_action: "按香港入境处或学校指引填写学生签证申请表。", source_name: "Hong Kong Immigration Department", source_url: "https://www.immd.gov.hk/eng/services/visas/study.html" },
      { name: "身份证明 / 护照复印件", category: "签证材料", stage: "CAS 与签证", next_action: "按学校和入境处要求准备个人身份证明。" },
      { name: "资金证明", category: "签证材料", stage: "CAS 与签证", next_action: "准备覆盖学费和生活费的资金材料。" },
      { name: "住宿证明", category: "住宿材料", stage: "住宿与付款", requirement_level: "视情况需要", next_action: "如已有宿舍或租房安排，保存相关证明。" },
      { name: "签证标签 / e-Visa", category: "签证材料", stage: "行前准备", next_action: "获批后保存电子签证或签证标签文件。" }
    ]
  },
  {
    title: "西班牙学生签证",
    description: "适合去西班牙读语言、本科、硕士或交换项目。",
    meta: "录取 · 资金 · 保险",
    materials: [
      { name: "学校录取通知书", category: "申请材料", stage: "CAS 与签证", next_action: "准备西班牙学校或语言中心的录取证明。" },
      { name: "签证申请表", category: "签证材料", stage: "CAS 与签证", next_action: "按西班牙签证中心或领馆要求填写。", source_name: "Spain visa information", source_url: "https://www.exteriores.gob.es/" },
      { name: "护照", category: "签证材料", stage: "CAS 与签证", next_action: "确认有效期和空白页。" },
      { name: "资金证明", category: "签证材料", stage: "CAS 与签证", next_action: "准备覆盖学习和生活期间的资金材料。" },
      { name: "医疗保险", category: "签证材料", stage: "CAS 与签证", next_action: "准备符合西班牙要求的医疗保险。" },
      { name: "住宿证明", category: "住宿材料", stage: "住宿与付款", requirement_level: "视情况需要", next_action: "准备租房、宿舍或临时住宿证明。" },
      { name: "无犯罪 / 体检证明", category: "签证材料", stage: "CAS 与签证", requirement_level: "视情况需要", next_action: "长期学习签证可能需要，按领区要求确认。" }
    ]
  },
  {
    title: "意大利学生签证",
    description: "适合去意大利读本科、硕士、艺术院校或交换项目。",
    meta: "预注册 · 录取 · 资金",
    materials: [
      { name: "学校录取 / 预注册材料", category: "申请材料", stage: "CAS 与签证", next_action: "按学校和 Universitaly 流程确认录取或预注册状态。", source_name: "Universitaly", source_url: "https://www.universitaly.it/" },
      { name: "签证申请表", category: "签证材料", stage: "CAS 与签证", next_action: "按意大利签证中心或领馆要求填写。" },
      { name: "护照", category: "签证材料", stage: "CAS 与签证", next_action: "确认有效期和空白页。" },
      { name: "资金证明", category: "签证材料", stage: "CAS 与签证", next_action: "准备生活费、学费和资金来源证明。" },
      { name: "住宿证明", category: "住宿材料", stage: "住宿与付款", next_action: "准备租房、宿舍或接待证明。" },
      { name: "医疗保险", category: "签证材料", stage: "CAS 与签证", next_action: "准备符合要求的医疗保险。" },
      { name: "学历认证 / 价值声明", category: "学术材料", stage: "CAS 与签证", requirement_level: "视情况需要", next_action: "按学校、使领馆或签证中心要求确认是否需要。" }
    ]
  },
  {
    title: "加拿大旅游签",
    description: "适合短期旅游、探亲或访问加拿大。",
    meta: "TRV · 资金 · 行程",
    materials: [
      { name: "访客签证申请信息", category: "签证材料", stage: "申请准备", next_action: "按 IRCC 账号流程填写 visitor visa 申请。", source_name: "IRCC Visitor visa", source_url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada.html" },
      { name: "护照", category: "签证材料", stage: "申请准备", next_action: "确认有效期和出入境记录。" },
      { name: "资金证明", category: "签证材料", stage: "提交申请", next_action: "准备能覆盖旅行费用的资金证明。" },
      { name: "行程计划", category: "签证材料", stage: "提交申请", requirement_level: "视情况需要", next_action: "准备旅行日期、城市、住宿和预算说明。" },
      { name: "邀请信", category: "签证材料", stage: "提交申请", requirement_level: "视情况需要", next_action: "探亲访友时可准备加拿大邀请方信息。" },
      { name: "在职 / 在读证明", category: "签证材料", stage: "提交申请", requirement_level: "视情况需要", next_action: "按个人身份准备约束力材料。" }
    ]
  },
  {
    title: "澳洲访客签证 600",
    description: "适合去澳洲旅游、探亲或短期商务访问。",
    meta: "600 · 行程 · 资金",
    materials: [
      { name: "访客签证申请信息", category: "签证材料", stage: "申请准备", next_action: "按 ImmiAccount 流程申请 Visitor visa subclass 600。", source_name: "Australia Visitor visa 600", source_url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/visitor-600" },
      { name: "护照", category: "签证材料", stage: "申请准备", next_action: "确认有效期和个人信息。" },
      { name: "资金证明", category: "签证材料", stage: "提交申请", next_action: "准备能覆盖旅行费用的资金材料。" },
      { name: "行程计划", category: "签证材料", stage: "提交申请", requirement_level: "视情况需要", next_action: "准备旅行城市、时间和住宿安排。" },
      { name: "邀请信 / 关系证明", category: "签证材料", stage: "提交申请", requirement_level: "视情况需要", next_action: "探亲访友时准备邀请方和关系证明。" },
      { name: "在职 / 在读证明", category: "签证材料", stage: "提交申请", requirement_level: "视情况需要", next_action: "按个人身份准备工作或学习证明。" }
    ]
  }
];

const countryFilters = ["全部", "英国", "美国", "加拿大", "澳洲", "新西兰", "欧洲", "日本", "新加坡", "中国香港", "通用"];
const audienceFilters = ["全部", "学生", "在职", "游客", "商务", "家人"];
const templateTypeFilters = ["全部", "留学申请", "学生签证", "旅游签", "商务/访友", "住宿行前"];

function getTemplateTags(template: (typeof templateCards)[number]) {
  const text = `${template.title} ${template.description} ${template.meta}`;
  const countries = new Set<string>();
  const audiences = new Set<string>();
  const types = new Set<string>();

  if (text.includes("英国")) countries.add("英国");
  if (text.includes("美国")) countries.add("美国");
  if (text.includes("加拿大")) countries.add("加拿大");
  if (text.includes("澳洲")) countries.add("澳洲");
  if (text.includes("新西兰")) countries.add("新西兰");
  if (text.includes("日本")) countries.add("日本");
  if (text.includes("新加坡")) countries.add("新加坡");
  if (text.includes("香港")) countries.add("中国香港");
  if (["申根", "欧洲", "德国", "法国", "荷兰", "爱尔兰", "西班牙", "意大利"].some((word) => text.includes(word))) countries.add("欧洲");
  if (["住宿", "行前"].some((word) => text.includes(word))) countries.add("通用");

  if (["学生", "留学", "学习", "Student", "F-1", "500", "Study"].some((word) => text.includes(word))) audiences.add("学生");
  if (text.includes("在职")) audiences.add("在职");
  if (["旅游", "访客", "探亲"].some((word) => text.includes(word))) audiences.add("游客");
  if (["商务", "会议", "展会"].some((word) => text.includes(word))) audiences.add("商务");
  if (["探亲", "访友", "家庭"].some((word) => text.includes(word))) audiences.add("家人");

  if (text.includes("留学申请")) types.add("留学申请");
  if (["学生签证", "学习许可", "学生准证", "F-1", "500"].some((word) => text.includes(word))) types.add("学生签证");
  if (["旅游签", "访客签证", "B1/B2", "600"].some((word) => text.includes(word))) types.add("旅游签");
  if (["商务", "访友", "探亲"].some((word) => text.includes(word))) types.add("商务/访友");
  if (["住宿", "行前"].some((word) => text.includes(word))) types.add("住宿行前");

  return { countries, audiences, types };
}

function matchesFilter(values: Set<string>, selected: string) {
  return selected === "全部" || values.has(selected);
}

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

async function updatePasswordRequest(token: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || data.error_description || data.message || "修改密码失败");
  return data;
}

async function refreshSessionRequest(refreshToken: string) {
  const data = await authRequest("token?grant_type=refresh_token", { refresh_token: refreshToken });
  return data as Session;
}

function isExpiredTokenError(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes("jwt expired");
}

function isValidUrl(value: string) {
  if (!value.trim()) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function getCustomTemplateKey(userId?: string) {
  return `${CUSTOM_TEMPLATE_PREFIX}-${userId || "guest"}`;
}

function materialToTemplateItem(material: Material): TemplateMaterial {
  return {
    name: material.name,
    category: material.category,
    stage: material.stage || "其他",
    status: "未开始",
    requirement_level: material.requirement_level,
    deadline: null,
    note: "",
    source_name: material.source_name,
    source_url: material.source_url,
    how_to_get: material.how_to_get,
    next_action: material.next_action,
    applies_to: material.applies_to
  };
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
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [templateImportOpen, setTemplateImportOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackContact, setFeedbackContact] = useState("");
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [recoveryToken, setRecoveryToken] = useState("");
  const [message, setMessage] = useState("");
  const [busyTemplate, setBusyTemplate] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<(typeof templateCards)[number] | null>(null);
  const [countryFilter, setCountryFilter] = useState("全部");
  const [audienceFilter, setAudienceFilter] = useState("全部");
  const [templateTypeFilter, setTemplateTypeFilter] = useState("全部");
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("已确认");

  const shareUrl = profile ? `${window.location.origin}${BASE_PATH}/share/${profile.share_slug}` : "";
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = hash.get("access_token");
    const type = hash.get("type");
    if (token && type === "recovery") {
      setRecoveryToken(token);
      setMessage("请设置一个新密码。");
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }
    const saved = window.localStorage.getItem("study-v2-session");
    if (saved) setSession(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (!session) return;
    void loadUserData(session);
    const savedTemplates = window.localStorage.getItem(getCustomTemplateKey(session.user.id));
    setCustomTemplates(savedTemplates ? JSON.parse(savedTemplates) as CustomTemplate[] : []);
  }, [session]);

  useEffect(() => {
    const hasOpenModal = addModalOpen || shareModalOpen || templateImportOpen || feedbackModalOpen || Boolean(editingId);
    document.body.classList.toggle("modal-open", hasOpenModal);
    return () => document.body.classList.remove("modal-open");
  }, [addModalOpen, shareModalOpen, templateImportOpen, feedbackModalOpen, editingId]);

  const stats = useMemo(() => {
    const applicable = materials.filter((item) => item.status !== "不适用");
    const required = applicable.filter((item) => item.requirement_level === "必需");
    const readyRequired = required.filter((item) => readyStatuses.includes(item.status)).length;
    return {
      requiredTotal: required.length,
      readyRequired,
      percent: required.length ? Math.round((readyRequired / required.length) * 100) : 0,
      done: required.filter((item) => item.status === "已完成").length,
      uploaded: required.filter((item) => item.status === "已上传").length,
      confirmed: required.filter((item) => item.status === "已确认").length,
      notApplicable: materials.filter((item) => item.status === "不适用").length
    };
  }, [materials]);

  const filteredTemplates = useMemo(() => {
    return templateCards.filter((template) => {
      const tags = getTemplateTags(template);
      return matchesFilter(tags.countries, countryFilter)
        && matchesFilter(tags.audiences, audienceFilter)
        && matchesFilter(tags.types, templateTypeFilter);
    });
  }, [countryFilter, audienceFilter, templateTypeFilter]);

  const nextMaterial = useMemo(() => {
    return materials.find((item) => item.requirement_level === "必需" && item.status !== "不适用" && !readyStatuses.includes(item.status))
      || materials.find((item) => item.status !== "不适用" && !readyStatuses.includes(item.status))
      || null;
  }, [materials]);

  function validateMaterialForm() {
    const errors: FormErrors = {};
    if (!form.name.trim()) errors.name = "请输入材料名称";
    if (!isValidUrl(form.source_url)) errors.source_url = "请输入有效网址";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function openAddMaterialModal() {
    setEditingId(null);
    setForm(defaultForm);
    setFormErrors({});
    setAddModalOpen(true);
  }

  function closeMaterialModal() {
    setEditingId(null);
    setAddModalOpen(false);
    setForm(defaultForm);
    setFormErrors({});
  }

  function updateFormField<Key extends keyof typeof defaultForm>(key: Key, value: (typeof defaultForm)[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (formErrors[key]) {
      setFormErrors((current) => ({ ...current, [key]: undefined }));
    }
  }

  function scrollToTemplates() {
    const templateSection = document.getElementById("templates-section") as HTMLDetailsElement | null;
    if (templateSection) templateSection.open = true;
    window.setTimeout(() => {
      templateSection?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  async function handleAuth(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      if (authMode === "forgot") {
        const redirectTo = `${window.location.origin}${BASE_PATH || ""}${window.location.pathname.replace(BASE_PATH, "")}`;
        await authRequest(`recover?redirect_to=${encodeURIComponent(redirectTo)}`, { email });
        setMessage("如果这个邮箱已注册，我们会发送一封重置密码邮件。请去邮箱里点链接。");
        return;
      }
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

  async function handlePasswordReset(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (resetPassword.length < 6) {
      setMessage("新密码至少 6 位。");
      return;
    }
    try {
      await updatePasswordRequest(recoveryToken, resetPassword);
      setRecoveryToken("");
      setResetPassword("");
      setAuthMode("login");
      setMessage("密码已更新，请用新密码登录。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "修改密码失败");
    }
  }

  async function refreshSession(currentSession: Session) {
    if (!currentSession.refresh_token) throw new Error("登录已过期，请重新登录。");
    const data = await refreshSessionRequest(currentSession.refresh_token);
    const nextSession: Session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || currentSession.refresh_token,
      user: data.user || currentSession.user
    };
    window.localStorage.setItem("study-v2-session", JSON.stringify(nextSession));
    setSession(nextSession);
    return nextSession;
  }

  async function requestWithSession<T>(path: string, options: RequestInit = {}) {
    if (!session) throw new Error("请先登录。");
    try {
      return await apiRequest<T>(path, session.access_token, options);
    } catch (error) {
      if (!isExpiredTokenError(error)) throw error;
      const nextSession = await refreshSession(session);
      return apiRequest<T>(path, nextSession.access_token, options);
    }
  }

  function getStoredSession() {
    const saved = window.localStorage.getItem("study-v2-session");
    return saved ? JSON.parse(saved) as Session : null;
  }

  async function loadUserData(currentSession: Session) {
    try {
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
    } catch (error) {
      if (!isExpiredTokenError(error)) {
        setMessage(error instanceof Error ? error.message : "加载失败，请重新登录。");
        toast.error(error instanceof Error ? error.message : "加载失败，请重新登录");
        return;
      }
      try {
        const nextSession = await refreshSession(currentSession);
        await loadUserData(nextSession);
      } catch {
        logout();
        setMessage("登录已过期，请重新登录。");
        toast.error("登录状态过期了，请重新登录");
      }
    }
  }

  async function addMaterialsFromTemplate(items: TemplateMaterial[] = seedMaterials, label = "默认材料") {
    if (!session) return;
    setBusyTemplate(label);
    setMessage(`正在添加「${label}」...`);
    const toastId = toast.loading(`正在添加「${label}」...`);
    try {
      const existing = new Set(materials.map((item) => item.name));
      const rows = items.filter((item) => !existing.has(item.name)).map((item) => ({
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
        setMessage(`${label}已经添加过了。`);
        toast.info("这些材料已经在你的清单里了", { id: toastId });
        return;
      }
      await requestWithSession<Material[]>("materials", { method: "POST", body: JSON.stringify(rows) });
      await loadUserData(getStoredSession() || session);
      setMessage(`已从「${label}」添加 ${rows.length} 项材料。`);
      toast.success(`已添加 ${rows.length} 项材料`, { id: toastId });
    } catch (error) {
      setMessage(error instanceof Error ? `添加失败：${error.message}` : "添加失败，请稍后再试。");
      toast.error(error instanceof Error ? `添加失败：${error.message}` : "添加失败，请稍后再试", { id: toastId });
    } finally {
      setBusyTemplate("");
    }
  }

  async function addSeedMaterials() {
    await addMaterialsFromTemplate(seedMaterials, "默认材料");
  }

  function persistCustomTemplates(nextTemplates: CustomTemplate[]) {
    if (!session) return;
    window.localStorage.setItem(getCustomTemplateKey(session.user.id), JSON.stringify(nextTemplates));
    setCustomTemplates(nextTemplates);
  }

  function saveCurrentAsTemplate() {
    if (!session) return;
    if (!materials.length) {
      toast.info("现在还没有材料可以保存为模板");
      return;
    }
    const title = window.prompt("给这个模板起个名字", "我的材料模板");
    if (!title?.trim()) return;
    const nextTemplate: CustomTemplate = {
      id: `${Date.now()}`,
      title: title.trim(),
      createdAt: new Date().toISOString(),
      materials: materials.map(materialToTemplateItem)
    };
    const nextTemplates = [nextTemplate, ...customTemplates].slice(0, 12);
    persistCustomTemplates(nextTemplates);
    toast.success("模板已保存");
  }

  async function importCustomTemplate(template: CustomTemplate) {
    await addMaterialsFromTemplate(template.materials, template.title);
    setTemplateImportOpen(false);
  }

  function deleteCustomTemplate(templateId: string) {
    if (!window.confirm("确定要删除这个自定义模板吗？")) return;
    const nextTemplates = customTemplates.filter((template) => template.id !== templateId);
    persistCustomTemplates(nextTemplates);
    toast.success("模板已删除");
  }

  function toggleTemplatePreview(template: (typeof templateCards)[number]) {
    const shouldOpen = previewTemplate?.title !== template.title;
    setPreviewTemplate(shouldOpen ? template : null);
    setMessage(shouldOpen ? `正在预览「${template.title}」。` : `已收起「${template.title}」预览。`);
    toast.message(shouldOpen ? `正在预览「${template.title}」` : `已收起「${template.title}」预览`);
    if (shouldOpen) {
      window.setTimeout(() => {
        document.getElementById("template-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }

  async function saveMaterial(event: FormEvent) {
    event.preventDefault();
    if (!session) return;
    if (!validateMaterialForm()) {
      toast.error("请先检查表单内容");
      return;
    }
    const isEditing = Boolean(editingId);
    const payload = {
      user_id: session.user.id,
      ...form,
      deadline: form.deadline || null
    };
    try {
      if (editingId) {
        await requestWithSession<Material[]>(`materials?id=eq.${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await requestWithSession<Material[]>("materials", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      setForm(defaultForm);
      setFormErrors({});
      setEditingId(null);
      setAddModalOpen(false);
      await loadUserData(getStoredSession() || session);
      setMessage(isEditing ? "材料已保存。" : "材料已添加。");
      toast.success(isEditing ? "已保存" : "已添加成功");
    } catch (error) {
      const text = error instanceof Error ? error.message : "操作失败，请稍后重试";
      setMessage(text);
      toast.error(text.toLowerCase().includes("jwt expired") ? "登录状态过期了，请重新登录" : text);
    }
  }

  async function deleteMaterial(id: string) {
    if (!session || !window.confirm("确定要删除这个材料吗？")) return;
    try {
      await requestWithSession(`materials?id=eq.${id}`, { method: "DELETE" });
      await loadUserData(getStoredSession() || session);
      setMessage("材料已删除。");
      toast.success("已删除");
    } catch (error) {
      const text = error instanceof Error ? error.message : "删除失败，请稍后再试";
      setMessage(text);
      toast.error(text);
    }
  }

  function toggleSelectMaterial(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleSelectAll() {
    setSelectedIds((current) => current.length === materials.length ? [] : materials.map((item) => item.id));
  }

  async function updateSelectedStatus(status: string) {
    if (!session || !selectedIds.length) return;
    setMessage(`正在批量更新 ${selectedIds.length} 项材料...`);
    const toastId = toast.loading(`正在更新 ${selectedIds.length} 项材料...`);
    try {
      await Promise.all(selectedIds.map((id) => requestWithSession<Material[]>(`materials?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      })));
      await loadUserData(getStoredSession() || session);
      setBulkStatus(status);
      setMessage(`已将 ${selectedIds.length} 项材料改为「${status}」。`);
      toast.success("批量状态已更新", { id: toastId });
    } catch (error) {
      setMessage(error instanceof Error ? `批量更新失败：${error.message}` : "批量更新失败，请稍后再试。");
      toast.error(error instanceof Error ? `批量更新失败：${error.message}` : "批量更新失败，请稍后再试", { id: toastId });
    }
  }

  async function deleteSelectedMaterials() {
    if (!session || !selectedIds.length) return;
    if (!window.confirm(`确定删除选中的 ${selectedIds.length} 项材料吗？`)) return;
    setMessage(`正在删除 ${selectedIds.length} 项材料...`);
    const toastId = toast.loading(`正在删除 ${selectedIds.length} 项材料...`);
    try {
      await Promise.all(selectedIds.map((id) => requestWithSession(`materials?id=eq.${id}`, { method: "DELETE" })));
      await loadUserData(getStoredSession() || session);
      setSelectedIds([]);
      setMessage("已删除选中的材料。");
      toast.success("已删除所选材料", { id: toastId });
    } catch (error) {
      setMessage(error instanceof Error ? `批量删除失败：${error.message}` : "批量删除失败，请稍后再试。");
      toast.error(error instanceof Error ? `批量删除失败：${error.message}` : "批量删除失败，请稍后再试", { id: toastId });
    }
  }

  async function quickConfirm(material: Material) {
    if (!session) return;
    setMessage(`正在确认「${material.name}」...`);
    const toastId = toast.loading(`正在确认「${material.name}」...`);
    try {
      await requestWithSession<Material[]>(`materials?id=eq.${material.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "已确认" })
      });
      await loadUserData(getStoredSession() || session);
      setMessage(`已确认「${material.name}」。`);
      toast.success("已确认", { id: toastId });
    } catch (error) {
      setMessage(error instanceof Error ? `确认失败：${error.message}` : "确认失败，请稍后再试。");
      toast.error(error instanceof Error ? `确认失败：${error.message}` : "确认失败，请稍后再试", { id: toastId });
    }
  }

  function startEdit(material: Material) {
    setBulkMode(false);
    setAddModalOpen(false);
    setEditingId(material.id);
    setFormErrors({});
    setMessage(`正在编辑「${material.name}」。`);
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
    setSelectedIds([]);
  }

  async function copyShareUrl() {
    if (!shareUrl) {
      setMessage("分享链接还在生成中，请稍等几秒再试。");
      toast.info("分享链接还在生成中，请稍等几秒");
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage("已复制家庭分享链接。");
      toast.success("链接已复制");
    } catch {
      toast.error("复制失败，请手动复制链接");
    }
  }

  function saveFeedback(event: FormEvent) {
    event.preventDefault();
    if (!feedbackText.trim()) {
      toast.error("先写一点反馈内容吧");
      return;
    }
    const saved = window.localStorage.getItem("pathfolio-feedback-drafts");
    const rows = saved ? JSON.parse(saved) as Array<{ text: string; contact: string; createdAt: string }> : [];
    const nextRows = [{
      text: feedbackText.trim(),
      contact: feedbackContact.trim(),
      createdAt: new Date().toISOString()
    }, ...rows].slice(0, 30);
    window.localStorage.setItem("pathfolio-feedback-drafts", JSON.stringify(nextRows));
    setFeedbackText("");
    setFeedbackContact("");
    setFeedbackModalOpen(false);
    toast.success("反馈已保存，谢谢你");
  }

  function renderMaterialForm(submitLabel: string) {
    return (
      <form className="grid-form" onSubmit={saveMaterial}>
        <label className="label">
          材料名称
          <input
            className={`input ${formErrors.name ? "input-error" : ""}`}
            value={form.name}
            onChange={(e) => updateFormField("name", e.target.value)}
            aria-invalid={Boolean(formErrors.name)}
          />
          {formErrors.name && <span className="field-error">{formErrors.name}</span>}
        </label>
        <Select label="分类" value={form.category} options={categories} onChange={(value) => updateFormField("category", value)} />
        <Select label="阶段" value={form.stage} options={stages} onChange={(value) => updateFormField("stage", value)} />
        <Select label="状态" value={form.status} options={statuses} onChange={(value) => updateFormField("status", value)} />
        <Select label="重要程度" value={form.requirement_level} options={levels} onChange={(value) => updateFormField("requirement_level", value)} />
        <label className="label">截止日期<input className="input" type="date" value={form.deadline} onChange={(e) => updateFormField("deadline", e.target.value)} /></label>
        <label className="label">来源名称<input className="input" value={form.source_name} onChange={(e) => updateFormField("source_name", e.target.value)} /></label>
        <label className="label">
          官方入口
          <input
            className={`input ${formErrors.source_url ? "input-error" : ""}`}
            value={form.source_url}
            onChange={(e) => updateFormField("source_url", e.target.value)}
            placeholder="https://..."
            aria-invalid={Boolean(formErrors.source_url)}
          />
          {formErrors.source_url && <span className="field-error">{formErrors.source_url}</span>}
        </label>
        <label className="label col-span-full md:col-span-2">下一步动作<textarea className="input" rows={3} value={form.next_action} onChange={(e) => updateFormField("next_action", e.target.value)} /></label>
        <label className="label col-span-full md:col-span-2">适用情况<textarea className="input" rows={3} value={form.applies_to} onChange={(e) => updateFormField("applies_to", e.target.value)} /></label>
        <label className="label col-span-full">备注<textarea className="input" rows={3} value={form.note} onChange={(e) => updateFormField("note", e.target.value)} /></label>
        <button className="button button-primary" type="submit">{submitLabel}</button>
        <button className="button button-soft" type="button" onClick={closeMaterialModal}>取消</button>
      </form>
    );
  }

  function renderFloatingActions(showLogout = false) {
    return (
      <>
        <div className="floating-actions" aria-label="页面快捷操作">
          <button className="floating-action-button" type="button" onClick={() => setFeedbackModalOpen(true)}>反馈</button>
          {showLogout && <button className="floating-action-button" type="button" onClick={logout}>退出登录</button>}
        </div>
        {feedbackModalOpen && (
          <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="提交反馈">
            <form className="feedback-modal" onSubmit={saveFeedback}>
              <div className="share-modal-head">
                <div>
                  <h2>反馈</h2>
                  <p>告诉我哪里不好用、哪里看不懂，或者你希望下一个版本加什么。</p>
                </div>
                <button className="icon-close" type="button" onClick={() => setFeedbackModalOpen(false)} aria-label="关闭反馈弹窗">×</button>
              </div>
              <label className="label">
                你的建议
                <textarea className="input" rows={5} value={feedbackText} onChange={(event) => setFeedbackText(event.target.value)} placeholder="例如：模板太多、按钮不明显、某个签证材料不准..." />
              </label>
              <label className="label">
                联系方式，可选
                <input className="input" value={feedbackContact} onChange={(event) => setFeedbackContact(event.target.value)} placeholder="邮箱 / 微信 / 备注" />
              </label>
              <div className="feedback-modal-actions">
                <button className="button button-primary" type="submit">提交反馈</button>
                <a className="button button-soft" href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer">打开表单</a>
              </div>
            </form>
          </div>
        )}
      </>
    );
  }

  function renderLegalNotice() {
    return (
      <section className="legal-notice" aria-label="使用说明和隐私提示">
        <div>
          <p className="eyebrow" lang="en">privacy note</p>
          <h2>使用前的小提醒</h2>
        </div>
        <div className="legal-grid">
          <p>材料清单只用于个人整理参考，最终要求请以学校、使馆、移民局或官方签证网站为准。</p>
          <p>建议只记录材料状态和官方入口，不要上传或填写护照、身份证、银行流水等敏感原件信息。</p>
          <p>你的账号数据用于同步个人清单；家人分享链接为只读页面，可以查看进度，但不能编辑。</p>
        </div>
      </section>
    );
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return (
      <main className="page">
        <section className="card panel">
          <h1 className="text-3xl font-bold">还差环境变量</h1>
          <p className="subtle mt-3">请先创建 .env.local，填入 Supabase URL 和 Publishable key。</p>
        </section>
        {renderLegalNotice()}
        {renderFloatingActions(false)}
      </main>
    );
  }

  if (!session) {
    return (
      <main className="page">
        <section className="hero hero-landing">
          <div className="hero-copy">
            <p className="eyebrow" lang="en">pathfolio</p>
            <h1>从申请到签证，一页管理所有材料</h1>
            <p className="subtle">从学校申请到学生签证、旅游签、住宿和行前准备，把跨国材料整理成一个清晰的进度页。</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#auth">免费开始整理材料</a>
              <a className="button button-soft" href={`${BASE_PATH}/demo`}>查看示例清单</a>
            </div>
            <div className="feature-strip" aria-label="核心功能">
              <span>全球模板库</span>
              <span>家人只读分享</span>
              <span>云端同步清单</span>
            </div>
          </div>
          {recoveryToken ? (
            <form className="card panel auth-box" id="auth" onSubmit={handlePasswordReset}>
              <h2 className="text-2xl font-bold">设置新密码</h2>
              <p className="auth-hint">输入一个新的登录密码，之后就可以用新密码进入你的清单。</p>
              <input className="input" type="password" placeholder="新密码，至少 6 位" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} required />
              <button className="button button-primary" type="submit">更新密码</button>
              <button className="button button-soft" type="button" onClick={() => { setRecoveryToken(""); setResetPassword(""); setAuthMode("login"); }}>
                返回登录
              </button>
              {message && <p className="subtle">{message}</p>}
            </form>
          ) : (
            <form className="card panel auth-box" id="auth" onSubmit={handleAuth}>
              <h2 className="text-2xl font-bold">{authMode === "login" ? "登录" : authMode === "signup" ? "注册" : "找回密码"}</h2>
              <p className="auth-hint">
                {authMode === "forgot" ? "输入注册邮箱，我们会发送一封重置密码邮件。" : "每个用户登录后都有自己的云端清单。"}
              </p>
              <input className="input" type="email" placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} required />
              {authMode !== "forgot" && (
                <input className="input" type="password" placeholder="密码，至少 6 位" value={password} onChange={(e) => setPassword(e.target.value)} required />
              )}
              <button className="button button-primary" type="submit">{authMode === "login" ? "登录" : authMode === "signup" ? "创建账号" : "发送重置邮件"}</button>
              <div className="auth-switches">
                <button className="button button-soft" type="button" onClick={() => setAuthMode(authMode === "signup" ? "login" : "signup")}>
                  {authMode === "signup" ? "已有账号？去登录" : "没有账号？去注册"}
                </button>
                {authMode !== "forgot" ? (
                  <button className="button button-plain" type="button" onClick={() => setAuthMode("forgot")}>忘记密码？</button>
                ) : (
                  <button className="button button-plain" type="button" onClick={() => setAuthMode("login")}>返回登录</button>
                )}
              </div>
              {message && <p className="subtle">{message}</p>}
            </form>
          )}
        </section>

        <section className="parent-story">
          <div>
            <p className="eyebrow">Family Share</p>
            <h2>爸妈总问材料办到哪了？</h2>
            <p>生成一个只读链接，他们可以随时看进度，但不能修改你的清单。你少解释几遍，他们也更安心。</p>
          </div>
          <div className="family-preview-card">
            <span>妈妈看到的页面</span>
            <strong>签证材料 7 / 10</strong>
            <p>最近更新：TB 肺结核检测证明已完成</p>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: "70%" }} />
            </div>
          </div>
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
                  <p>成绩单、语言成绩、文书和推荐信</p>
                </div>
              </div>
              <div className="preview-step">
                <span />
                <div>
                  <strong>选择目的地模板</strong>
                  <p>英国、美国、加拿大、澳洲、欧洲和亚洲</p>
                </div>
              </div>
              <div className="preview-step">
                <span />
                <div>
                  <strong>签证与行前</strong>
                  <p>学生签、旅游签、住宿、保险和到校注册</p>
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
              <p>模板按国家、人群和签证类型筛选，再按时间线放进你的个人清单。</p>
            </article>
          </div>
        </section>
        {renderLegalNotice()}
        {renderFloatingActions(false)}
      </main>
    );
  }

  return (
    <main className="page dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-copy">
          <h1 className="brand-title" lang="en">pathfolio</h1>
          <p className="subtle">按国家、申请阶段、签证类型和行前任务整理材料。你更新进度，家人只读查看。</p>
        </div>

        <div className="progress-panel">
          <div className="progress-main">
            <div>
              <span>必需材料</span>
              <strong>{stats.requiredTotal ? `${stats.readyRequired} / ${stats.requiredTotal}` : "等待添加"}</strong>
            </div>
            <b>{stats.requiredTotal ? `${stats.percent}%` : "--"}</b>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${stats.percent}%` }} />
          </div>
          <div className="stats compact-stats">
            <span className="stat">完成<strong>{stats.done}</strong></span>
            <span className="stat">上传<strong>{stats.uploaded}</strong></span>
            <span className="stat">确认<strong>{stats.confirmed}</strong></span>
            <span className="stat">不适用<strong>{stats.notApplicable}</strong></span>
          </div>
          <button className="button button-soft progress-share-button" type="button" onClick={() => setShareModalOpen(true)}>
            家庭只读分享
          </button>
        </div>
      </section>

      <section className="next-step-card">
        <div>
          <p className="eyebrow">Next Step</p>
          <h2>{nextMaterial ? `下一步：${nextMaterial.name}` : materials.length ? "所有材料都处理完了" : "先生成你的第一份清单"}</h2>
          <p>
            {nextMaterial
              ? nextMaterial.next_action || nextMaterial.how_to_get || "打开材料详情，补充下一步动作和官方入口。"
              : materials.length
                ? "目前没有未完成材料，可以检查是否有视情况材料需要标记为不适用。"
                : "从模板库选择国家、身份和签证类型，一键生成适合你的材料清单。"}
          </p>
        </div>
        <div className="next-step-actions">
          {nextMaterial?.source_url && <a className="button button-soft" href={nextMaterial.source_url} target="_blank" rel="noopener noreferrer">官方入口</a>}
          {nextMaterial && <button className="button button-primary" type="button" onClick={() => quickConfirm(nextMaterial)}>一键确认</button>}
          {!materials.length && <button className="button button-primary" type="button" onClick={scrollToTemplates}>去选择模板</button>}
        </div>
      </section>

      <details className="card panel section-details" id="templates-section" open>
        <summary className="section-summary">
          <div>
            <p className="eyebrow">Templates</p>
            <h2 className="section-title">选择模板</h2>
          </div>
          <span className="collapse-icon" aria-hidden="true" />
        </summary>
        <p className="section-note">点一下模板先预览材料；再点同一个模板可收起预览。可以先用筛选缩小范围，再添加到正式清单。</p>
        <div className="template-filters" aria-label="模板筛选">
          <SegmentedFilter label="国家 / 地区" value={countryFilter} options={countryFilters} onChange={setCountryFilter} />
          <SegmentedFilter label="人群" value={audienceFilter} options={audienceFilters} onChange={setAudienceFilter} />
          <SegmentedFilter label="类型" value={templateTypeFilter} options={templateTypeFilters} onChange={setTemplateTypeFilter} />
        </div>
        <div className="template-result-row">
          <span>{filteredTemplates.length} 个模板</span>
          {(countryFilter !== "全部" || audienceFilter !== "全部" || templateTypeFilter !== "全部") && (
            <button className="button button-plain" type="button" onClick={() => { setCountryFilter("全部"); setAudienceFilter("全部"); setTemplateTypeFilter("全部"); }}>
              清空筛选
            </button>
          )}
        </div>
        <div className="template-grid">
          {filteredTemplates.map((template) => (
            <button
              className={`template-card ${previewTemplate?.title === template.title ? "template-card-active" : ""}`}
              type="button"
              key={template.title}
              disabled={Boolean(busyTemplate)}
              onClick={() => toggleTemplatePreview(template)}
            >
              <span>{template.meta}</span>
              <strong>{template.title}</strong>
              <p>{template.description}</p>
              <em>{previewTemplate?.title === template.title ? "正在预览" : `${template.materials.length} 项材料`}</em>
            </button>
          ))}
        </div>
        {!filteredTemplates.length && (
          <div className="empty-state">
            <span className="empty-icon">?</span>
            <strong>没有找到匹配模板</strong>
            <p>可以清空筛选，或者换一个国家、身份、签证类型组合。</p>
            <div className="empty-actions">
              <button className="button button-soft" type="button" onClick={() => { setCountryFilter("全部"); setAudienceFilter("全部"); setTemplateTypeFilter("全部"); }}>
                清空筛选
              </button>
            </div>
          </div>
        )}
        {previewTemplate && (
          <div className="template-preview" id="template-preview">
            <div className="template-preview-head">
              <div>
                <p className="eyebrow">Preview</p>
                <h3>{previewTemplate.title}材料预览</h3>
              </div>
              <div className="preview-actions">
                <button className="button button-primary" type="button" onClick={() => addMaterialsFromTemplate(previewTemplate.materials, previewTemplate.title)} disabled={Boolean(busyTemplate)}>
                  {busyTemplate === previewTemplate.title ? "添加中..." : "添加到我的清单"}
                </button>
                <button className="button button-soft" type="button" onClick={() => setPreviewTemplate(null)}>收起预览</button>
              </div>
            </div>
            <div className="preview-material-grid">
              {previewTemplate.materials.map((item) => (
                <article className="preview-material" key={`${previewTemplate.title}-${item.name}`}>
                  <div>
                    <strong>{item.name}</strong>
                    <p>{item.next_action || item.applies_to || "按官方要求确认材料细节。"}</p>
                  </div>
                  <span>{item.stage}</span>
                </article>
              ))}
            </div>
          </div>
        )}
        {message && <p className="feedback">{message}</p>}
      </details>

      {addModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="添加材料">
          <div className="edit-modal">
            <div className="modal-drag-handle" aria-hidden="true" />
            <div className="edit-modal-head">
              <div>
                <p className="eyebrow">New Material</p>
                <h2>添加材料</h2>
                <p>把临时想到的材料补进清单，保存后会同步到云端。</p>
              </div>
              <button className="button button-soft" type="button" onClick={closeMaterialModal}>关闭</button>
            </div>
            {renderMaterialForm("添加材料")}
          </div>
        </div>
      )}

      {shareModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="家庭只读分享">
          <div className="share-modal">
            <div className="share-modal-head">
              <div>
                <h2>共享材料进度</h2>
                <p>只分享截至目前的材料状态，家人可以查看，但不能编辑。</p>
              </div>
              <button className="icon-close" type="button" onClick={() => setShareModalOpen(false)} aria-label="关闭分享弹窗">×</button>
            </div>
            <div className="share-options">
              <div className="share-option share-option-active">
                <span className="share-option-icon">⌁</span>
                <div>
                  <strong>私人</strong>
                  <p>只有你登录后可以编辑</p>
                </div>
                <span className="share-radio share-radio-active" />
              </div>
              <div className="share-option">
                <span className="share-option-icon">◎</span>
                <div>
                  <strong>创建共享链接</strong>
                  <p>拥有链接的家人可以查看最新进度</p>
                </div>
                <span className="share-radio" />
              </div>
            </div>
            <p className="share-warning">分享前，请检查备注和材料里是否包含敏感信息。这个链接是只读的，家人不能改你的清单。</p>
            <div className="share-link-row">
              <code>{shareUrl || "正在生成分享链接..."}</code>
              <button className="button button-primary" type="button" onClick={copyShareUrl}>复制链接</button>
            </div>
          </div>
        </div>
      )}

      {templateImportOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="导入自定义模板">
          <div className="template-import-modal">
            <div className="share-modal-head">
              <div>
                <h2>导入模板</h2>
                <p>把你保存过的个性化模板，一键放进当前清单。已有同名材料会自动跳过。</p>
              </div>
              <button className="icon-close" type="button" onClick={() => setTemplateImportOpen(false)} aria-label="关闭导入模板弹窗">×</button>
            </div>
            {customTemplates.length ? (
              <div className="custom-template-list">
                {customTemplates.map((template) => (
                  <article className="custom-template-card" key={template.id}>
                    <div>
                      <strong>{template.title}</strong>
                      <p>{template.materials.length} 项材料 · {new Date(template.createdAt).toLocaleDateString("zh-CN")}</p>
                    </div>
                    <div className="custom-template-actions">
                      <button className="button button-primary" type="button" onClick={() => importCustomTemplate(template)}>导入</button>
                      <button className="button button-plain" type="button" onClick={() => deleteCustomTemplate(template.id)}>删除</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state modal-empty-state">
                <span className="empty-icon">+</span>
                <strong>还没有自定义模板</strong>
                <p>先在“我的清单”里整理好材料，然后点击“保存模板”。</p>
                <div className="empty-actions">
                  <button className="button button-soft" type="button" onClick={() => setTemplateImportOpen(false)}>回到清单</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {editingId && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="编辑材料">
          <div className="edit-modal">
            <div className="modal-drag-handle" aria-hidden="true" />
            <div className="edit-modal-head">
              <div>
                <p className="eyebrow">Edit Material</p>
                <h2>编辑材料</h2>
                <p>修改后点击保存，内容会立刻同步到你的清单。</p>
              </div>
              <button className="button button-soft" type="button" onClick={closeMaterialModal}>关闭</button>
            </div>
            {renderMaterialForm("保存修改")}
          </div>
        </div>
      )}

      <details className="card panel section-details" open>
        <summary className="section-summary">
          <div>
            <p className="eyebrow">Timeline</p>
            <h2 className="section-title">我的清单</h2>
          </div>
          <div className="section-summary-actions">
            <button
              className="button button-soft"
              type="button"
              onClick={(event) => {
                event.preventDefault();
                setBulkMode(!bulkMode);
                setSelectedIds([]);
              }}
            >
              {bulkMode ? "退出批量" : "批量管理"}
            </button>
            <button
              className="button button-soft"
              type="button"
              onClick={(event) => {
                event.preventDefault();
                saveCurrentAsTemplate();
              }}
            >
              保存模板
            </button>
            <button
              className="button button-soft"
              type="button"
              onClick={(event) => {
                event.preventDefault();
                setTemplateImportOpen(true);
              }}
            >
              导入模板
            </button>
            <button
              className="button add-material-button"
              type="button"
              onClick={(event) => {
                event.preventDefault();
                openAddMaterialModal();
              }}
            >
              ＋ 添加材料
            </button>
            <span className="collapse-icon" aria-hidden="true" />
          </div>
        </summary>
        <div className="bulk-toolbar">
          <div>
            <strong>{bulkMode ? `已选择 ${selectedIds.length} 项` : `共 ${materials.length} 项材料`}</strong>
            <p>{bulkMode ? "勾选材料后可以统一修改状态或删除。" : "开启批量管理后，可以一次处理多项材料。"}</p>
          </div>
          <div className="bulk-actions">
            {bulkMode && (
              <>
                <button className="button button-soft" type="button" onClick={toggleSelectAll}>{selectedIds.length === materials.length ? "取消全选" : "全选"}</button>
                <select className="bulk-select" value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)}>
                  {statuses.map((status) => <option value={status} key={status}>{status}</option>)}
                </select>
                <button className="button button-primary" type="button" disabled={!selectedIds.length} onClick={() => updateSelectedStatus(bulkStatus)}>应用状态</button>
                <button className="button button-soft" type="button" disabled={!selectedIds.length} onClick={() => updateSelectedStatus("已确认")}>一键确认</button>
                <button className="button button-danger" type="button" disabled={!selectedIds.length} onClick={deleteSelectedMaterials}>删除所选</button>
              </>
            )}
          </div>
        </div>
        {!materials.length && (
          <div className="empty-state">
            <span className="empty-icon">+</span>
            <strong>还没有材料清单</strong>
            <p>选择一个模板，系统会帮你生成第一版；也可以手动添加第一项材料。</p>
            <div className="empty-actions">
              <button className="button button-primary" type="button" onClick={openAddMaterialModal}>添加第一项材料</button>
              <button className="button button-soft" type="button" onClick={scrollToTemplates}>从模板添加</button>
              <a className="button button-plain" href={`${BASE_PATH}/demo`}>查看示例清单</a>
            </div>
          </div>
        )}
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
                    <article className={`material-card ${selectedIds.includes(item.id) ? "material-card-selected" : ""}`} key={item.id}>
                      {bulkMode && (
                        <label className="select-check">
                          <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelectMaterial(item.id)} />
                          <span>选择</span>
                        </label>
                      )}
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
                        {item.status !== "已确认" && <button className="button button-primary" type="button" onClick={() => quickConfirm(item)}>一键确认</button>}
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
      </details>
      {renderLegalNotice()}
      {renderFloatingActions(true)}
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

function SegmentedFilter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="filter-group">
      <span>{label}</span>
      <div className="filter-scroll">
        {options.map((option) => (
          <button
            className={value === option ? "filter-chip filter-chip-active" : "filter-chip"}
            type="button"
            key={option}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
