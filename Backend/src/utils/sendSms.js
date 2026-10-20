const TEXTBEE_ENDPOINT = "https://api.textbee.dev/api/v1/gateway/send-sms";

// TextBee expects the recipient with a country code, so a bare 10 digit
// Indian number is normalised to +91 before it goes out.
const toIndianNumber = (phone) => {
  const digits = String(phone ?? "").replace(/\D/g, "");

  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;

  throw new Error(`Invalid Indian phone number: ${digits.length} digits received`);
};

const sendTextBeeSms = async (phone, message) => {
  const apiKey = process.env.TEXTBEE_API_KEY;
  const deviceId = process.env.TEXTBEE_DEVICE_ID;

  if (!apiKey) throw new Error("TEXTBEE_API_KEY is missing");
  if (!deviceId) throw new Error("TEXTBEE_DEVICE_ID is missing");

  const response = await fetch(TEXTBEE_ENDPOINT, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      deviceId,
      recipients: [toIndianNumber(phone)],
      message
    })
  });

  const raw = await response.text();
  let data;

  try {
    data = JSON.parse(raw);
  } catch {
    data = { error: raw };
  }

  if (!response.ok) {
    throw new Error(
      data?.message || data?.error || `TextBee failed with status ${response.status}`
    );
  }

  return data;
};

export { sendTextBeeSms };
