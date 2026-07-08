# Study Abroad Checklist V2

账号版留学材料助手。

## 这一版支持

- 邮箱注册 / 登录
- 每个账号独立管理自己的材料
- 材料保存到 Supabase
- 家庭只读分享链接
- 家人打开分享页只能看，不能改

## 本地运行前要做

复制 `.env.local.example` 为 `.env.local`，然后填入：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://efzkktcabxrqilpqojxs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的-sb_publishable-key
```

注意：不要填写 `sb_secret_...`。

## 运行

```bash
npm install
npm run dev
```

然后打开：

```text
http://localhost:3000
```

## 部署到 Vercel

在 Vercel 项目里添加同样两个环境变量：

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

然后部署。
