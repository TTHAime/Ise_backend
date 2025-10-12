# ---------- Base ----------
FROM node:20-bookworm-slim AS base
ENV TZ=Asia/Bangkok
WORKDIR /app
# ใช้ corepack เพื่อให้ pnpm ตาม packageManager
RUN corepack enable

# ---------- Builder ----------
FROM base AS builder

# เตรียม pnpm ให้ตรงเวอร์ชันที่โปรเจกต์ระบุ
COPY package.json pnpm-lock.yaml ./
RUN corepack prepare pnpm@10.17.0 --activate \
    && apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl build-essential \
    && rm -rf /var/lib/apt/lists/* \
    && pnpm install --frozen-lockfile

# คัดลอกซอร์สทั้งหมด (รวม prisma/)
COPY . .

# สร้าง Prisma Client **ก่อน** build เพื่อให้ type ครบ
RUN pnpm db:generate

# คอมไพล์ TypeScript
RUN pnpm build

# ทำชุด production deps แยก (เล็กกว่า)
RUN pnpm prune --prod

# ---------- Runtime ----------
FROM base AS runner

# ติดตั้ง tesseract และภาษา (ถ้าไม่ใช้ native OCR ตัดส่วนนี้ออกได้)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr tesseract-ocr-eng tesseract-ocr-tha ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# ใช้ user ไม่ใช่ root เพื่อความปลอดภัย
RUN useradd -m -u 10001 nodeuser
USER nodeuser

# คัดลอกไฟล์ที่ต้องใช้รันจริง
COPY --chown=nodeuser:nodeuser --from=builder /app/dist ./dist
COPY --chown=nodeuser:nodeuser --from=builder /app/node_modules ./node_modules
COPY --chown=nodeuser:nodeuser package.json pnpm-lock.yaml ./
# ถ้าต้องใช้ไฟล์ schema/runtime ของ Prisma ใน container (เช่น migrate)
COPY --chown=nodeuser:nodeuser --from=builder /app/prisma ./prisma

EXPOSE 4000

# ถ้า deploy ไป Render/Supabase ให้ migrate schema ก่อน start
# ถ้าไม่อยาก migrate ที่ runtime เปลี่ยนเป็น `node dist/server.js` ได้
CMD ["sh", "-c", "node -v && npx prisma migrate deploy && node dist/server.js"]
