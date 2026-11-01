require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || `http://localhost:${PORT},http://127.0.0.1:${PORT}`)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({ error: 'Origin nay khong duoc phep goi API.' });
  }
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Anh toi da 5 MB se thanh khoang 6.7 MB khi ma hoa Base64.
app.use(express.json({ limit: '8mb' }));

const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Bạn đã gửi quá nhiều yêu cầu. Hãy thử lại sau ít phút.' },
});

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function makeRuleResult({ loai, kieu, dau_hieu, nen_lam, cau_hoi_nen_hoi }) {
  return {
    muc_do: 'nguy_hiem',
    diem_nghi_ngo: 95,
    loai,
    kieu,
    dau_hieu,
    cau_hoi_nen_hoi,
    nen_lam,
    nguon_phan_tich: 'luat',
  };
}

function matchHighConfidenceRule(text) {
  const normalized = normalizeText(text);
  const educationalContext = /\b(canh bao|nhan dien|phong chong|dau hieu lua dao|khong nen (tham gia|nap tien|chuyen tien|gui|cung cap|cho muon|cho thue)|khong duoc (tham gia|nap tien|chuyen tien|gui|cung cap|cho muon|cho thue)|khong (tham gia|nap tien|chuyen tien|gui ma otp|cung cap ma otp|cho muon tai khoan|cho thue tai khoan)|dung chuyen tien|tranh xa)\b/.test(normalized);
  if (educationalContext) return null;

  const policeImpersonation = /\b(cong an|bo cong an|co quan dieu tra|nhan vien cong an)\b/.test(normalized);
  const forcedTransfer = /\b(chuyen tien|chuyen toan bo|tai khoan an toan|nap tien|giai ngan|dong bang tai san)\b/.test(normalized);
  if (policeImpersonation && forcedTransfer) {
    return makeRuleResult({
      loai: 'lua_dao_khac',
      kieu: 'Giả danh cơ quan công an',
      dau_hieu: ['Người gửi tự xưng là công an hoặc cơ quan điều tra và yêu cầu chuyển tiền.', 'Cơ quan chức năng không yêu cầu chuyển tiền vào tài khoản cá nhân để điều tra.'],
      cau_hoi_nen_hoi: ['Bạn đã tự gọi số điện thoại chính thức của cơ quan công an để xác minh chưa?'],
      nen_lam: 'Không chuyển tiền, không cung cấp mã OTP hoặc thông tin tài khoản. Ngắt liên lạc và gọi cơ quan công an qua số chính thức.',
    });
  }

  const requestsSecret = /\b(gui|cung cap|doc|nhap|xac minh)\b/.test(normalized);
  if (requestsSecret && /\b(ma otp|otp|mat khau|ma xac thuc)\b/.test(normalized)) {
    return makeRuleResult({
      loai: 'lua_dao_khac',
      kieu: 'Yêu cầu mã bảo mật',
      dau_hieu: ['Nội dung yêu cầu cung cấp mã OTP, mật khẩu hoặc mã xác thực.', 'Mã xác thực là thông tin bí mật; không chia sẻ cho bất kỳ ai.'],
      cau_hoi_nen_hoi: ['Yêu cầu này có xuất hiện trong ứng dụng hoặc kênh chính thức không?'],
      nen_lam: 'Không gửi mã OTP hoặc mật khẩu. Tự mở ứng dụng chính thức để kiểm tra và đổi mật khẩu nếu đã lỡ chia sẻ.',
    });
  }

  if (/\b(nhan tien ho|cho muon tai khoan|thue tai khoan|cho thue tai khoan)\b/.test(normalized)) {
    return makeRuleResult({
      loai: 'viec_lam_lua_dao',
      kieu: 'Nhờ nhận tiền hộ hoặc thuê tài khoản',
      dau_hieu: ['Có lời đề nghị dùng tài khoản cá nhân để nhận tiền hộ hoặc nhận hoa hồng.', 'Việc này có thể khiến bạn liên quan đến dòng tiền bất hợp pháp.'],
      cau_hoi_nen_hoi: ['Đơn vị tuyển dụng có hợp đồng và thông tin pháp lý để kiểm chứng không?'],
      nen_lam: 'Không cho mượn hoặc cho thuê tài khoản, không nhận/chuyển tiền hộ. Lưu lại tin nhắn và xác minh đơn vị qua nguồn chính thức.',
    });
  }

  const gamblingTopic = /\b(ca do|cuoc bong da|nha cai|soi keo|tai xiu|co bac online)\b/.test(normalized);
  const gamblingAction = /\b(hay|tham gia|ru|moi|nap tien|dang ky|dat cuoc|nhan thuong)\b/.test(normalized);
  if (gamblingTopic && gamblingAction) {
    return makeRuleResult({
      loai: 'co_bac_online',
      kieu: 'Rủ rê tham gia cá độ hoặc cờ bạc',
      dau_hieu: ['Nội dung có lời rủ rê hoặc hướng dẫn tham gia cá độ/cờ bạc.', 'Cá độ có thể gây thiệt hại tài chính và rủi ro pháp lý.'],
      cau_hoi_nen_hoi: ['Ai gửi lời mời và có đang yêu cầu nạp tiền hoặc cung cấp thông tin không?'],
      nen_lam: 'Không tham gia, không nạp tiền và không gửi thông tin tài khoản. Chặn lời mời nếu tiếp tục gây áp lực.',
    });
  }

  const jobTopic = /\b(viec lam|tuyen dung|cong tac vien|ctv|lam nhiem vu|like video|dat don ao)\b/.test(normalized);
  const asksUpfrontMoney = /\b(nap tien|nap\s+\d|chuyen khoan truoc|dat coc|dong phi|nop phi|phi ho so|phi dong phuc|mo nhiem vu)\b/.test(normalized);
  const explicitlyNoFee = /\b(khong thu phi|khong can nap tien|khong yeu cau chuyen tien)\b/.test(normalized);
  if (jobTopic && asksUpfrontMoney && !explicitlyNoFee) {
    return makeRuleResult({
      loai: 'viec_lam_lua_dao',
      kieu: 'Yêu cầu nộp tiền trước khi nhận việc',
      dau_hieu: ['Tin tuyển dụng yêu cầu nạp tiền, đặt cọc hoặc đóng phí trước khi làm việc.', 'Đây là dấu hiệu thường gặp của bẫy tuyển dụng/nhiệm vụ.'],
      cau_hoi_nen_hoi: ['Công ty có tên pháp lý, địa chỉ và hợp đồng để xác minh không?', 'Khoản tiền này dựa trên quy định chính thức nào?'],
      nen_lam: 'Không chuyển tiền trước khi xác minh độc lập doanh nghiệp và hợp đồng. Dừng trao đổi nếu họ ép bạn thanh toán gấp.',
    });
  }

  return null;
}

function getGeminiConfigs() {
  return [
    {
      key: process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL_1 || process.env.GEMINI_MODEL || 'gemini-4-argon',
    },
    {
      key: process.env.GEMINI_API_KEY_2,
      model: process.env.GEMINI_MODEL_2 || 'gemini-3.5-flash-lite',
    },
    {
      key: process.env.GEMINI_API_KEY_3,
      model: process.env.GEMINI_MODEL_3 || 'gemini-3.1-flash-lite',
    },
  ]
    .filter((config) => config.key?.trim())
    .map((config) => ({ ...config, key: config.key.trim() }));
}

function getRetryableStatus(error) {
  const values = [error?.status, error?.statusCode, error?.response?.status, error?.error?.code];
  for (const value of values) {
    const status = Number(value);
    if ([401, 403, 404, 429].includes(status) || (status >= 500 && status <= 599)) return status;
  }
  const detail = `${error?.message || ''} ${error?.error?.status || ''}`.toUpperCase();
  if (/RESOURCE_EXHAUSTED|RATE_LIMIT/.test(detail)) return 429;
  if (/PERMISSION_DENIED/.test(detail)) return 403;
  if (/UNAUTHENTICATED/.test(detail)) return 401;
  if (/NOT_FOUND|MODEL_NOT_FOUND/.test(detail)) return 404;
  if (/UNAVAILABLE|INTERNAL|SERVICE_UNAVAILABLE/.test(detail)) return 503;
  return 0;
}

function parseGeminiResult(rawText) {
  let result;
  try {
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    result = JSON.parse(jsonText);
  } catch {
    return null;
  }

  if (!result || !['nguy_hiem', 'can_than', 'an_toan'].includes(result.muc_do)) return null;
  if (!Number.isFinite(result.diem_nghi_ngo)) return null;
  if (!Array.isArray(result.dau_hieu) || !Array.isArray(result.cau_hoi_nen_hoi)) return null;
  if (typeof result.nen_lam !== 'string' || !result.nen_lam.trim()) return null;

  const kieuKey = String(result.kieu || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
  const kieuLabels = {
    giadanhconganchucnang: 'Giả danh cơ quan chức năng',
    giadanhcongan: 'Giả danh cơ quan công an',
    yeucauchuyentien: 'Yêu cầu chuyển tiền',
    cuocadobac: 'Cá độ hoặc cờ bạc',
    chiemdoattaikhoan: 'Chiếm đoạt tài khoản',
    baytuyendung: 'Bẫy tuyển dụng',
    naptienlamnhiemvu: 'Nạp tiền làm nhiệm vụ',
    xacminhtaikhoan: 'Xác minh tài khoản',
    quangcaonhacai: 'Quảng cáo nhà cái',
    rurecado: 'Rủ rê cá độ',
  };

  return {
    muc_do: result.muc_do,
    diem_nghi_ngo: Math.max(0, Math.min(100, Math.round(result.diem_nghi_ngo))),
    loai: ['viec_lam_lua_dao', 'co_bac_online', 'lua_dao_khac', 'khong_ro'].includes(result.loai)
      ? result.loai
      : 'khong_ro',
    kieu: kieuLabels[kieuKey] || 'Dấu hiệu cần kiểm chứng thêm',
    dau_hieu: result.dau_hieu.filter((item) => typeof item === 'string').slice(0, 4),
    cau_hoi_nen_hoi: result.cau_hoi_nen_hoi.filter((item) => typeof item === 'string').slice(0, 3),
    nen_lam: result.nen_lam.trim(),
  };
}

app.post('/api/analyze', analyzeLimiter, async (req, res) => {
  const input = req.body || {};
  if (typeof input.text !== 'string') {
    return res.status(400).json({ error: 'Truong text phai la chuoi.' });
  }
  if (input.text.length > 20000) {
    return res.status(413).json({ error: 'Noi dung qua dai. Gioi han la 20.000 ky tu.' });
  }
  if (input.imageUrl && (typeof input.imageUrl !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(input.imageUrl))) {
    return res.status(400).json({ error: 'Anh phai la JPG, PNG hoac WEBP dang Base64.' });
  }
  if (input.imageUrl && input.imageUrl.length > 7_000_000) {
    return res.status(413).json({ error: 'Anh qua lon. Vui long chon anh toi da 5 MB.' });
  }

  const ruleResult = matchHighConfidenceRule(input.text);
  if (ruleResult) return res.json(ruleResult);

  const apiConfigs = getGeminiConfigs();
  if (apiConfigs.length === 0) {
      return res.status(503).json({
        error: 'Chua cau hinh Gemini API key trong backend/.env.'
      });
  }

  const systemInstruction = `Ban la chuyen gia nhan dien rui ro ve lua dao truc tuyen o Viet Nam.
  Bat buoc viet tat ca noi dung tieng Viet co day du dau; tuyet doi khong viet tieng Viet khong dau. Quy tac nay ap dung cho moi truong gia tri, dac biet la "kieu", "dau_hieu", "cau_hoi_nen_hoi" va "nen_lam". Truong "kieu" phai la nhan tieng Viet co dau, khong duoc tra ma may nhu chiem_doat_tai_khoan.
Chi danh gia thong tin duoc nguoi dung cung cap, khong khang dinh chac chan neu chua du bang chung.
Phan tich chung ve bẫy tuyển dụng, cờ bạc, tin gia va lua dao khac.
Quy tac 3 muc bat buoc:
- nguy_hiem: co yeu cau cu the bat buoc nap tien, chuyen tien, gui giay to nhay cam, tham gia ca do/cờ bạc, keu goi nha cuoc, "mo khoa rut tien", nhan tien ho/thue tai khoan, hoac mot ke hoach lua dao co dau hieu ro rang.
- can_than: co mot so dau hieu bat on nhu loi hua qua hap dan, ma link/lao, thieu hop dong, yeu cau lien lac rieng, chua du can cu de ket luan lua dao; can kiem chung truoc khi hanh dong.
- an_toan: thong tin minh bach, co thong tin phap ly co the kiem tra va khong yeu cau tien hoac hanh vi mao hiem; neu tu co van la hanh dong cờ bạc thi van la nguy_hiem.
Yeu cau, loi ru re hoac de xuat tham gia ca do, cuoc bong da, nha cai va lap nhom soi keo phai la nguy_hiem va loai co_bac_online. Khong danh an_toan chi vi noi dung qua ngan.
Can khang dinh moi duoc dua ra tren noi dung; khong goi link va khong yeu cau nguoi dung cung cap thong tin nhay cam.
Tra ve duy nhat mot JSON hop le theo dung cau truc sau:
{
  "muc_do": "nguy_hiem" | "can_than" | "an_toan",
  "diem_nghi_ngo": number tu 0 den 100,
  "loai": "viec_lam_lua_dao" | "co_bac_online" | "lua_dao_khac" | "khong_ro",
  "kieu": "Giả danh cơ quan chức năng" | "Yêu cầu chuyển tiền" | "Cá độ hoặc cờ bạc" | "Chiếm đoạt tài khoản" | "Bẫy tuyển dụng" | "Thông tin chưa rõ",
  "dau_hieu": ["Lý do phân tích bằng tiếng Việt có dấu."],
  "cau_hoi_nen_hoi": ["Câu hỏi kiểm chứng bằng tiếng Việt có dấu."],
  "nen_lam": "Lời khuyên viết bằng tiếng Việt có dấu, ngắn gọn và rõ ràng."
}`;

  const parts = [];
  if (input.text.trim()) {
    parts.push({ text: `Noi dung nguoi dung yeu cau phan tich:\n${input.text}` });
  }
  if (input.imageUrl) {
    const match = input.imageUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Anh khong dung dinh dang ho tro.' });
    }
    parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
  }

  let lastStatus = 502;
  for (let index = 0; index < apiConfigs.length; index += 1) {
    try {
      const ai = new GoogleGenAI({ apiKey: apiConfigs[index].key });
      const response = await ai.models.generateContent({
        model: apiConfigs[index].model,
        config: {
          systemInstruction,
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
        contents: [{ role: 'user', parts }],
      });
      const result = parseGeminiResult(response.text || '');
      if (!result) {
        lastStatus = 502;
        console.warn(`Gemini key ${index + 1} returned invalid JSON/schema; trying next key.`);
        continue;
      }
      return res.json({ ...result, nguon_phan_tich: 'ai' });
    } catch (error) {
      const retryableStatus = getRetryableStatus(error);
      if ([401, 403, 404, 429].includes(retryableStatus) || retryableStatus >= 500) {
        lastStatus = retryableStatus;
        console.warn(`Gemini config ${index + 1} (${apiConfigs[index].model}) failed with status ${retryableStatus}; trying next config.`);
        continue;
      }
      console.error(`Gemini key ${index + 1} failed with a non-retryable error.`);
      return res.status(502).json({ error: 'Khong the goi dich vu Gemini.' });
    }
  }

  return res.status(lastStatus).json({ error: 'Tat ca Gemini API key deu that bai hoac tra ve JSON khong hop le.' });
});

app.get('/api/health', (req, res) => {
  const configs = getGeminiConfigs();
  return res.json({
    ok: true,
    service: 'Vefiti API',
    aiConfigured: configs.length > 0,
    configuredKeyCount: configs.length,
    model: configs[0]?.model || 'gemini-4-argon',
    models: configs.map((config) => config.model),
  });
});

// Serve the single-page frontend from the project root without exposing backend files.
app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, '..', 'index.html')));

app.listen(PORT, () => console.log(`Vefiti dang chay: http://localhost:${PORT}`));