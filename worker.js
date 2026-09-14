// ============================================
// Telegram Mini App Backend - Cloudflare Worker
// ============================================
// এই Worker টেলিগ্রাম থেকে আসা initData ভেরিফাই করে
// এবং ইউজারের সম্পূর্ণ তথ্য ফেরত দেয়।
// ============================================

// ⚠️ এখানে আপনার Bot Token বসান (@BotFather থেকে)
const BOT_TOKEN = "YOUR_BOT_TOKEN_HERE";

// --------------------------------------------
// হেক্স স্ট্রিং → বাইট অ্যারে কনভার্টার
// Telegram hash যাচাইয়ের জন্য দরকার
// --------------------------------------------
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// --------------------------------------------
// Telegram initData ভেরিফিকেশন (HMAC-SHA256)
// এটাই সবচেয়ে গুরুত্বপূর্ণ নিরাপত্তা স্তর
// --------------------------------------------
async function verifyInitData(initData, botToken) {
  // initData কে URL প্যারামে পার্স করি
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  
  // hash না থাকলে ভেরিফাই করা যাবে না
  if (!hash) return null;

  // hash প্যারামটি বাদ দিই
  params.delete('hash');

  // বাকি সব প্যারাম alphabetical সাজিয়ে checkString বানাই
  const checkString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  // প্রথম ধাপ: "WebAppData" কী দিয়ে HMAC
  const secretKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('WebAppData'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // দ্বিতীয় ধাপ: প্রাপ্ত key দিয়ে Bot Token সাইন
  const derivedKey = await crypto.subtle.sign(
    'HMAC',
    secretKey,
    new TextEncoder().encode(botToken)
  );

  // চূড়ান্ত verify key তৈরি
  const verifyKey = await crypto.subtle.importKey(
    'raw',
    derivedKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  // hash মিলিয়ে দেখি
  const isValid = await crypto.subtle.verify(
    'HMAC',
    verifyKey,
    hexToBytes(hash),
    new TextEncoder().encode(checkString)
  );

  if (!isValid) return null;

  // ইউজার অবজেক্ট পার্স করি
  const userStr = params.get('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  }
  return null;
}

// --------------------------------------------
// JSON রেসপন্স হেল্পার (CORS সহ)
// --------------------------------------------
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// --------------------------------------------
// মূল Fetch Handler
// --------------------------------------------
export default {
  async fetch(request, env) {
    // CORS preflight রিকোয়েস্ট হ্যান্ডেল
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url = new URL(request.url);

    // /api/user এন্ডপয়েন্ট
    if (url.pathname === '/api/user' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { initData } = body;

        // initData না থাকলে এরর
        if (!initData) {
          return jsonResponse({ success: false, error: 'initData প্রয়োজন' }, 400);
        }

        // Telegram ডাটা ভেরিফাই করি
        const user = await verifyInitData(initData, BOT_TOKEN);

        if (!user) {
          return jsonResponse({ success: false, error: 'ভেরিফিকেশন ব্যর্থ' }, 403);
        }

        // সফল হলে সম্পূর্ণ ইউজার ইনফো ফেরত দিই
        return jsonResponse({
          success: true,
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name || '',
            username: user.username || '',
            language_code: user.language_code || 'N/A',
            is_premium: user.is_premium || false,
            is_bot: user.is_bot || false,
            photo_url: user.photo_url || '',
            fullName: [user.first_name, user.last_name].filter(Boolean).join(' '),
          },
          auth_date: new URLSearchParams(initData).get('auth_date'),
        });

      } catch (error) {
        return jsonResponse({ success: false, error: 'সার্ভার ত্রুটি: ' + error.message }, 500);
      }
    }

    // হেলথ চেক রুট
    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse({ 
        status: 'ok', 
        message: 'Telegram Mini App Backend চালু আছে ✅' 
      });
    }

    return jsonResponse({ success: false, error: 'এন্ডপয়েন্ট পাওয়া যায়নি' }, 404);
  },
};
